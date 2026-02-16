// Import required Node.js and external modules
import fs from 'node:fs';
import stream from 'node:stream';
import util from 'util';
import axios from 'axios';  // For fetching remote resources
import mime from 'mime';    // For determining MIME types of local files

// Convert callback-based functions to Promise-based for async/await usage
const pipeline = util.promisify(stream.pipeline);
const readFileAsync = util.promisify(fs.readFile);

/**
 * Main function to inline external resources in an HTML file
 * 
 * This function reads an HTML file, processes it to inline external resources
 * (images, videos, fonts, CSS, JavaScript), and writes the result to an output file.
 * 
 * @param inputFilePath - Path to the input HTML file
 * @param outputFilePath - Path where the processed HTML will be saved
 * @param ignore - Array of resource types to exclude from inlining.
 *                 Options: 'images', 'videos', 'fonts', 'stylesheets', 'scripts'
 * @returns {Promise<void>}
 */
async function asyncHtmlInline(inputFilePath: string, outputFilePath: string, ignore: string[] = []): Promise<void> {
  try {
    // Create a stream pipeline: read input → transform (inline resources) → write output
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

/**
 * Custom Transform Stream that processes HTML and inlines external resources
 * 
 * This stream reads HTML chunks, identifies external resource references,
 * fetches and converts them to base64 data URIs, and replaces the original
 * references with the inlined data.
 */
class TransformStream extends stream.Transform {
  private ignore: string[];  // List of resource types to skip during inlining
  private buffer: string;    // Buffer to accumulate incomplete HTML tags across chunks

  constructor(ignore: string[], options?: stream.TransformOptions) {
    super(options);
    this.ignore = ignore;
    this.buffer = '';
  }

  /**
   * Transform method that processes each chunk of HTML data
   * 
   * This method identifies various HTML tags that reference external resources
   * and replaces them with inlined versions (base64 data URIs).
   * 
   * @param chunk - Chunk of HTML data to process
   * @param encoding - Character encoding of the chunk
   * @param callback - Callback to signal completion
   * @returns {Promise<void>}
   * @private
   */
  async _transform(chunk: any, encoding: BufferEncoding, callback: stream.TransformCallback): Promise<void> {
    // Combine buffer with new chunk to handle tags that span multiple chunks
    const data = this.buffer + chunk.toString();
    
    // Regex to match all supported HTML tags with external resources:
    // - <link rel="stylesheet"> for CSS files
    // - <style> tags with inline CSS (may contain @import or url())
    // - <img src=""> for images
    // - <image href=""> for SVG image elements
    // - <video poster=""> for video poster images
    // - <object data=""> for embedded objects
    // - <embed src=""> for embedded content
    // - <source src=""> for video/audio sources
    // - <script src=""> for JavaScript files
    const regex = /<link\s+[^>]*rel="stylesheet"[^>]*>|<style[^>]*>([\s\S]*?)<\/style>|<img\s+[^>]*src="([^"]+)"[^>]*>|<image\s+[^>]*href="([^"]+)"[^>]*\/?>|<video\s+[^>]*poster="([^"]+)"[^>]*>|<object\s+[^>]*data="([^"]+)"[^>]*>|<embed\s+[^>]*src="([^"]+)"[^>]*\/?>|<source\s+[^>]*src="([^"]+)"[^>]*>|<script\s+[^>]*src="([^"]+)"[^>]*><\/script>/gs;
    let lastIndex = 0;
    let match;

    // Process each matched tag
    while ((match = regex.exec(data))) {
      const tag = match[0];
      
      // Determine which type of tag was matched by testing against specific patterns
      const inlineStyleMatch = tag.match(/<style[^>]*>([\s\S]*?)<\/style>/);
      const imgSrcMatch = tag.match(/<img[^>]*src="([^"]+)"[^>]*>/);
      const svgImageHrefMatch = tag.match(/<image[^>]*href="([^"]+)"[^>]*\/?>/);
      const videoPosterMatch = tag.match(/<video[^>]*poster="([^"]+)"[^>]*>/);
      const objectDataMatch = tag.match(/<object[^>]*data="([^"]+)"[^>]*>/);
      const embedSrcMatch = tag.match(/<embed[^>]*src="([^"]+)"[^>]*\/?>/);
      const videoSourceMatch = tag.match(/<source[^>]*src="([^"]+)"[^>]*>/);
      const cssHrefMatch = tag.match(/<link[^>]*href="([^"]+)"[^>]*>/);
      const jsSrcMatch = tag.match(/<script[^>]*src="([^"]+)"[^>]*><\/script>/);

      // Handle inline <style> tags - process CSS for @import rules and url() references
      if (inlineStyleMatch) {
        if (!this.ignore.includes('stylesheets')) {
          // Push everything before this tag
          this.push(data.slice(lastIndex, match.index));
          lastIndex = regex.lastIndex;
          
          // Extract and process the CSS content (handles fonts, images, @import)
          const styleContent = inlineStyleMatch[1];
          const processedCss = await this.processCssAndFonts(styleContent);
          this.push(`<style>${processedCss}</style>`);
        }
      // Handle <img> tags - convert image src to base64 data URI
      } else if (imgSrcMatch) {
        if (!this.ignore.includes('images')) {
          this.push(data.slice(lastIndex, match.index));
          lastIndex = regex.lastIndex;
          
          // Fetch and convert the image to base64
          const imgSrc = imgSrcMatch[1];
          const imgData = await this.readAndConvertImage(imgSrc);
          
          if (imgData !== null) {
            // Replace only the src attribute, preserving all other attributes
            const inlinedTag = tag.replace(/src="[^"]*"/, `src="${imgData}"`);
            this.push(inlinedTag);
          } else {
            // If inlining failed, keep the original tag
            this.push(tag);
          }
        }
      // Handle SVG <image> elements - convert href to base64 data URI
      } else if (svgImageHrefMatch) {
        if (!this.ignore.includes('images')) {
          this.push(data.slice(lastIndex, match.index));
          lastIndex = regex.lastIndex;
          
          const imageSrc = svgImageHrefMatch[1];
          const imageData = await this.readAndConvertImage(imageSrc);
          
          if (imageData !== null) {
            // Replace href attribute while preserving other attributes
            const inlinedTag = tag.replace(/href="[^"]*"/, `href="${imageData}"`);
            this.push(inlinedTag);
          } else {
            this.push(tag);
          }
        }
      // Handle <video poster=""> attributes - inline the poster image
      } else if (videoPosterMatch) {
        if (!this.ignore.includes('images')) {
          this.push(data.slice(lastIndex, match.index));
          lastIndex = regex.lastIndex;
          
          const posterSrc = videoPosterMatch[1];
          const posterData = await this.readAndConvertImage(posterSrc);
          
          if (posterData !== null) {
            // Replace poster attribute with base64 data URI
            const inlinedTag = tag.replace(/poster="[^"]*"/, `poster="${posterData}"`);
            this.push(inlinedTag);
          } else {
            this.push(tag);
          }
        }
      // Handle <object data=""> tags - inline the object data
      } else if (objectDataMatch) {
        if (!this.ignore.includes('images')) {
          this.push(data.slice(lastIndex, match.index));
          lastIndex = regex.lastIndex;
          
          const objectSrc = objectDataMatch[1];
          const objectData = await this.readAndConvertImage(objectSrc);
          
          if (objectData !== null) {
            // Replace data attribute with base64 data URI
            const inlinedTag = tag.replace(/data="[^"]*"/, `data="${objectData}"`);
            this.push(inlinedTag);
          } else {
            this.push(tag);
          }
        }
      // Handle <embed src=""> tags - inline the embedded content
      } else if (embedSrcMatch) {
        if (!this.ignore.includes('images')) {
          this.push(data.slice(lastIndex, match.index));
          lastIndex = regex.lastIndex;
          
          const embedSrc = embedSrcMatch[1];
          const embedData = await this.readAndConvertImage(embedSrc);
          
          if (embedData !== null) {
            // Replace src attribute with base64 data URI
            const inlinedTag = tag.replace(/src="[^"]*"/, `src="${embedData}"`);
            this.push(inlinedTag);
          } else {
            this.push(tag);
          }
        }
      // Handle <source src=""> tags (video/audio sources) - inline the video file
      } else if (videoSourceMatch) {
        if (!this.ignore.includes('videos')) {
          this.push(data.slice(lastIndex, match.index));
          lastIndex = regex.lastIndex;
          
          // Fetch and convert the video file to base64
          const videoSrc = videoSourceMatch[1];
          const videoData = await this.readAndConvertVideo(videoSrc);
          
          if (videoData !== null) {
            // Replace src attribute with base64 data URI
            const inlinedTag = tag.replace(/src="[^"]*"/, `src="${videoData}"`);
            this.push(inlinedTag);
          } else {
            this.push(tag);
          }
        }
      // Handle <link rel="stylesheet"> tags - inline external CSS
      } else if (cssHrefMatch) {
        const cssFilePath = cssHrefMatch[1];
        
        // Check if this is a font stylesheet (e.g., Google Fonts)
        const isFontStylesheet = cssFilePath.includes('fonts.googleapis.com') || cssFilePath.includes('fonts.gstatic.com');
        
        // Skip font stylesheets if fonts are excluded from inlining
        if (isFontStylesheet && this.ignore.includes('fonts')) {
          continue;
        }
        
        if (!this.ignore.includes('stylesheets')) {
          this.push(data.slice(lastIndex, match.index));
          lastIndex = regex.lastIndex;

          // Fetch the CSS file and process it (handles @import, fonts, images)
          const cssContent = await this.fetchResource(cssFilePath);
          if (cssContent !== null) {
            const processedCss = await this.processCssAndFonts(cssContent);
            // Replace <link> tag with inline <style> tag
            this.push(`<style>${processedCss}</style>`);
          } else {
            this.push(tag);
          }
        }
      // Handle <script src=""> tags - inline external JavaScript
      } else if (jsSrcMatch) {
        if (!this.ignore.includes('scripts')) {
          this.push(data.slice(lastIndex, match.index));
          lastIndex = regex.lastIndex;

          // Fetch the JavaScript file
          const jsFilePath = jsSrcMatch[1];
          const jsContent = await this.fetchResource(jsFilePath);
          
          if (jsContent !== null) {
            // Replace <script src=""> with inline <script> tag
            this.push(`<script>${jsContent}</script>`);
          } else {
            this.push(tag);
          }
        }
      }
    }

    // Push any remaining data after the last match
    this.push(data.slice(lastIndex));
    this.buffer = '';
    callback();
  }

  /**
   * Flush method called when the stream is ending
   * 
   * Pushes any remaining buffered data to the output stream.
   * 
   * @param callback - Callback to signal completion
   * @private
   */
  _flush(callback: stream.TransformCallback): void {
    if (this.buffer) {
      this.push(this.buffer);
    }
    callback();
  }

  /**
   * Process CSS content and inline fonts, @import rules, and background-image URLs
   * 
   * This is the main CSS processing method that coordinates:
   * 1. Processing @import rules (often used for fonts)
   * 2. Processing url() references (for fonts, images, etc.)
   * 
   * @param css - CSS content to process
   * @returns {Promise<string>} - Processed CSS with inlined resources
   */
  async processCssAndFonts(css: string): Promise<string> {
    // First, process @import rules (e.g., @import url('https://fonts.googleapis.com/...'))
    if (!this.ignore.includes('fonts')) {
      css = await this.processImportRules(css);
    }
    
    // Then process url() references for fonts and images (e.g., background-image: url(...))
    css = await this.processCssUrls(css);
    
    return css;
  }

  /**
   * Process @import rules in CSS and inline imported stylesheets
   * 
   * This method finds all @import statements in CSS (commonly used for fonts),
   * fetches the imported stylesheets, processes them recursively, and replaces
   * the @import statements with the actual CSS content.
   * 
   * Supports both formats:
   * - @import url('...')
   * - @import '...'
   * 
   * @param css - CSS content containing @import rules
   * @returns {Promise<string>} - CSS with @import rules replaced by actual content
   */
  async processImportRules(css: string): Promise<string> {
    // Regex to match both @import url(...) and @import "..." formats
    const importRegex = /@import\s+url\(['"]?([^'"\)]+)['"]?\)|@import\s+['"]([^'"]+)['"]/g;
    let match;
    const replacements: Array<{original: string, replacement: string}> = [];

    // Find all @import statements
    while ((match = importRegex.exec(css)) !== null) {
      const originalImport = match[0];  // The full @import statement
      const importUrl = match[1] || match[2];  // The URL being imported
      
      try {
        // Fetch the imported stylesheet
        const importedCss = await this.fetchResource(importUrl);
        if (importedCss !== null) {
          // Recursively process the imported CSS (it may contain more @imports or fonts)
          const processedImportedCss = await this.processCssAndFonts(importedCss);
          replacements.push({
            original: originalImport,
            replacement: processedImportedCss
          });
        }
      } catch (e) {
        console.error('Error processing @import rule: ', e);
      }
    }

    // Apply all replacements to the CSS
    let processedCss = css;
    for (const {original, replacement} of replacements) {
      processedCss = processedCss.replace(original, replacement);
    }

    return processedCss;
  }

  /**
   * Process CSS content and inline background-image URLs and font URLs
   * 
   * This method finds all url() references in CSS (used for fonts, background images, etc.),
   * fetches the resources, converts them to base64 data URIs, and replaces the original URLs.
   * 
   * Handles:
   * - Font files (woff, woff2, ttf, otf) in @font-face rules
   * - Background images (background-image: url(...))
   * - Other CSS url() references
   * 
   * @param css - CSS content containing url() references
   * @returns {Promise<string>} - CSS with url() references replaced by data URIs
   */
  async processCssUrls(css: string): Promise<string> {
    // Regex to match url() with optional quotes: url("..."), url('...'), or url(...)
    const urlRegex = /url\(['"]?([^'")]+)['"]?\)/g;
    let match;
    const replacements: Array<{original: string, replacement: string}> = [];

    // Find all url() references in the CSS
    while ((match = urlRegex.exec(css)) !== null) {
      const originalUrl = match[0];  // The full url(...) statement
      const resourceUrl = match[1];  // The URL inside url()
      
      // Skip data URIs that are already inlined (avoid re-processing)
      if (resourceUrl.startsWith('data:')) {
        continue;
      }

      // Try to inline as font first (fonts are more specific), then as image
      let inlinedData = null;
      
      if (!this.ignore.includes('fonts')) {
        inlinedData = await this.readAndConvertFont(resourceUrl);
      }
      
      // If it's not a font (or fonts are excluded), try as an image
      if (inlinedData === null && !this.ignore.includes('images')) {
        inlinedData = await this.readAndConvertImage(resourceUrl);
      }
      
      // If we successfully inlined the resource, add it to replacements
      if (inlinedData !== null) {
        replacements.push({
          original: originalUrl,
          replacement: `url("${inlinedData}")`
        });
      }
    }

    // Apply all replacements to the CSS
    let processedCss = css;
    for (const {original, replacement} of replacements) {
      processedCss = processedCss.replace(original, replacement);
    }

    return processedCss;
  }

  /**
   * Fetch a text resource (CSS or JavaScript) from a URL or local file
   * 
   * This method handles both remote URLs (http/https) and local file paths.
   * It returns the content as a UTF-8 string.
   * 
   * @param src - URL or file path to fetch
   * @returns {Promise<string | null>} - Resource content as string, or null if failed
   */
  async fetchResource(src: string): Promise<string | null> {
    // Handle remote resources (CSS/JS from CDNs, etc.)
    if (src.startsWith('http://') || src.startsWith('https://')) {
      try {
        const response = await axios.get(src);
        if (response.status === 200)
          return response.data;
      } catch (error) {
        console.error('Error fetching resource: ', error);
        return null;
      }
    // Handle local file resources
    } else {
      try {
        return await readFileAsync(src, 'utf8');
      } catch (error) {
        console.error('Error reading file: ', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Read and convert an image file to a base64 data URI
   * 
   * This method fetches an image from a URL or local file, converts it to base64,
   * and returns a data URI that can be embedded directly in HTML/CSS.
   * 
   * Supports common image formats: jpg, png, gif, svg, webp, etc.
   * 
   * @param imgSrc - URL or file path to the image
   * @returns {Promise<string | null>} - Base64 data URI (e.g., "data:image/png;base64,..."), or null if failed
   */
  async readAndConvertImage(imgSrc: string): Promise<string | null> {
    // Handle remote images
    if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
      try {
        // Fetch as binary data (arraybuffer)
        let response = await axios.get(imgSrc, {responseType: 'arraybuffer'});
        if (response.status === 200) {
          // Create data URI with proper MIME type from response headers
          const prefix = `data:${response.headers['content-type']};base64,`;
          return prefix + Buffer.from(response.data).toString('base64');
        }
      } catch (e) {
        console.error('Error fetching or converting image file: ', e);
        return null;
      }
    // Handle local image files
    } else {
      try {
        // Determine MIME type from file extension
        const mimeType = mime.getType(imgSrc);
        if (!mimeType || !mimeType.startsWith('image/')) {
          console.error('This is not an image file: ' + imgSrc);
          return null;
        }
        // Read file as binary and convert to base64
        const imgData = await readFileAsync(imgSrc);
        const base64Image = Buffer.from(imgData).toString('base64');
        return `data:${mimeType};base64,${base64Image}`;
      } catch (error) {
        console.error('Error reading file: ', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Read and convert a video file to a base64 data URI
   * 
   * This method fetches a video from a URL or local file, converts it to base64,
   * and returns a data URI that can be embedded in <source> tags.
   * 
   * Supports common video formats: mp4, webm, ogg, etc.
   * 
   * Note: Video files can be very large, which may result in large HTML files.
   * 
   * @param videoSrc - URL or file path to the video
   * @returns {Promise<string | null>} - Base64 data URI (e.g., "data:video/mp4;base64,..."), or null if failed
   */
  async readAndConvertVideo(videoSrc: string): Promise<string | null> {
    // Handle remote videos
    if (videoSrc.startsWith('http://') || videoSrc.startsWith('https://')) {
      try {
        // Fetch as binary data (arraybuffer)
        let response = await axios.get(videoSrc, {responseType: 'arraybuffer'});
        if (response.status === 200) {
          // Create data URI with proper MIME type from response headers
          const prefix = `data:${response.headers['content-type']};base64,`;
          return prefix + Buffer.from(response.data).toString('base64');
        }
      } catch (e) {
        console.error('Error fetching or converting video file: ', e);
        return null;
      }
    // Handle local video files
    } else {
      try {
        // Determine MIME type from file extension
        const mimeType = mime.getType(videoSrc);
        if (!mimeType || !mimeType.startsWith('video/')) {
          console.error('This is not a video file: ' + videoSrc);
          return null;
        }
        // Read file as binary and convert to base64
        const videoData = await readFileAsync(videoSrc);
        const base64Video = Buffer.from(videoData).toString('base64');
        return `data:${mimeType};base64,${base64Video}`;
      } catch (error) {
        console.error('Error reading file: ', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Read and convert a font file to a base64 data URI
   * 
   * This method fetches a font from a URL or local file, converts it to base64,
   * and returns a data URI that can be embedded in @font-face rules.
   * 
   * Supports common font formats: woff, woff2, ttf, otf, eot
   * 
   * Returns null if the resource is not a font file, allowing the caller
   * to try other resource types (like images).
   * 
   * @param fontSrc - URL or file path to the font
   * @returns {Promise<string | null>} - Base64 data URI (e.g., "data:font/woff2;base64,..."), or null if not a font
   */
  async readAndConvertFont(fontSrc: string): Promise<string | null> {
    // Handle remote fonts (e.g., from Google Fonts CDN)
    if (fontSrc.startsWith('http://') || fontSrc.startsWith('https://')) {
      try {
        // Fetch as binary data (arraybuffer)
        let response = await axios.get(fontSrc, {responseType: 'arraybuffer'});
        if (response.status === 200) {
          const contentType = response.headers['content-type'];
          
          // Check if the content type indicates it's a font file
          if (contentType && (contentType.includes('font') || contentType.includes('woff') || contentType.includes('ttf') || contentType.includes('otf'))) {
            // Create data URI with proper MIME type from response headers
            const prefix = `data:${contentType};base64,`;
            return prefix + Buffer.from(response.data).toString('base64');
          }
        }
      } catch (e) {
        // Not a font file or error fetching, return null so caller can try as image
        return null;
      }
    // Handle local font files
    } else {
      try {
        // Determine MIME type from file extension
        const mimeType = mime.getType(fontSrc);
        
        // Check if the MIME type indicates it's a font file
        if (mimeType && (mimeType.includes('font') || mimeType.includes('woff') || mimeType.includes('ttf') || mimeType.includes('otf'))) {
          // Read file as binary and convert to base64
          const fontData = await readFileAsync(fontSrc);
          const base64Font = Buffer.from(fontData).toString('base64');
          return `data:${mimeType};base64,${base64Font}`;
        }
      } catch (error) {
        return null;
      }
    }
    return null;
  }
}

// Export the main function for use in other modules
export {asyncHtmlInline};
