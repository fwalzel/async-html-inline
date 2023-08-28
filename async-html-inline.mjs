import fs from 'node:fs';
import stream from 'node:stream';
import util from 'util';
import axios from 'axios';
import mime from 'mime';

const pipeline = util.promisify(stream.pipeline);
const readFileAsync = util.promisify(fs.readFile);

/**
 *
 * @param inputFilePath
 * @param outputFilePath
 * @param ignore
 * @returns {Promise<void>}
 */
async function asyncHtmlInline (inputFilePath, outputFilePath, ignore = []) {
  try {
    await pipeline(
      fs.createReadStream(inputFilePath, 'utf8'),
      new TransformStream(ignore),
      fs.createWriteStream(outputFilePath, 'utf8')
    );
    console.log('HTML modification completed.');
  } catch (error) {
    console.error('Error:', error);
  }
}

class TransformStream extends stream.Transform {
  constructor(ignore, options) {
    super(options);
    this.ignore = ignore;
    this.buffer = '';
  }

  /**
   *
   * @param chunk
   * @param encoding
   * @param callback
   * @returns {Promise<void>}
   * @private
   */
  async _transform(chunk, encoding, callback) {
    const data = this.buffer + chunk.toString();
    const regex = /<link\s+[^>]*rel="stylesheet"[^>]*>|<img\s+[^>]*src="([^"]+)"[^>]*>|<script\s+[^>]*src="([^"]+)"[^>]*><\/script>/gs;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(data))) {
      const tag = match[0];
      const imgSrcMatch = tag.match(/<img[^>]*src="([^"]+)"[^>]*>/);
      const cssHrefMatch = tag.match(/href="([^"]+)"/);
      const jsSrcMatch = tag.match(/<script[^>]*src="([^"]+)"[^>]*><\/script>/);

      if (imgSrcMatch) {
        if (! this.ignore.includes('images')) {
          this.push(data.slice(lastIndex, match.index));
          lastIndex = regex.lastIndex;
          const imgSrc = imgSrcMatch[1];
          const imgData = await this.readAndConvertImage(imgSrc);
          if (imgData !== null) {
            this.push(`<img src="${imgData}" />`);
          }
        }
      } else if (cssHrefMatch) {
        if (! this.ignore.includes('stylesheets')) {
          this.push(data.slice(lastIndex, match.index));
          lastIndex = regex.lastIndex;

          const cssFilePath = cssHrefMatch[1];
          const cssContent = await this.fetchResource(cssFilePath);
          if (cssContent !== null) {
            this.push(`<style>${cssContent}</style>`);
          }
        }
      } else if (jsSrcMatch) {
        if (! this.ignore.includes('scripts')) {
          this.push(data.slice(lastIndex, match.index));
          lastIndex = regex.lastIndex;

          const jsFilePath = jsSrcMatch[1];
          const jsContent = await this.fetchResource(jsFilePath);
          if (jsContent !== null) {
            this.push(`<script>${jsContent}</script>`);
          }
        }
      }
    }

    this.push(data.slice(lastIndex));
    this.buffer = '';
    callback();
  }

  /**
   *
   * @param callback
   * @private
   */
  _flush(callback) {
    if (this.buffer) {
      this.push(this.buffer);
    }
    callback();
  }

  /**
   *
   * @param src
   * @returns {Promise<*|string>}
   */
  async fetchResource(src) {
    if (src.startsWith('http://') || src.startsWith('https://')) {
      try {
        const response = await axios.get(src);
        if (response.status === 200)
          return response.data;
      } catch (error) {
        console.error('Error fetching resource: ', error);
        return '';
      }
    }
    else {
      try {
        return await readFileAsync(src, 'utf8');
      } catch (error) {
        console.error('Error reading file: ', error);
        return '';
      }
    }
  }

  /**
   *
   * @param imgSrc
   * @returns {Promise<string>}
   */
  async readAndConvertImage(imgSrc) {
    if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
      try {
        let response = await axios.get(imgSrc, { responseType: 'arraybuffer' });
        if (response.status === 200) {
          const prefix = `data:${response.headers['content-type']};base64,`;
          return prefix + Buffer.from(response.data).toString('base64');
        }
      }
      catch (e) {
        console.error('Error fetching or converting image file: ', error);
        return '';
      }
    }
    else {
      try {
        const mimeType = mime.getType(imgSrc);
        if (! mimeType.startsWith('image/')) {
          console.error('This is not an image file: ' + imgSrc);
          return '';
        }
        const imgData = await readFileAsync(imgSrc);
        const base64Image = Buffer.from(imgData).toString('base64');
        return `data:${mimeType};base64,${base64Image}`;
      } catch (error) {
        console.error('Error reading file: ', error);
        return '';
      }
    }
  }
}

export { asyncHtmlInline };