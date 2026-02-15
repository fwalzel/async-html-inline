"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHtmlInline = asyncHtmlInline;
const node_fs_1 = __importDefault(require("node:fs"));
const node_stream_1 = __importDefault(require("node:stream"));
const util_1 = __importDefault(require("util"));
const axios_1 = __importDefault(require("axios"));
const mime_1 = __importDefault(require("mime"));
const pipeline = util_1.default.promisify(node_stream_1.default.pipeline);
const readFileAsync = util_1.default.promisify(node_fs_1.default.readFile);
/**
 *
 * @param inputFilePath
 * @param outputFilePath
 * @param ignore
 * @returns {Promise<void>}
 */
async function asyncHtmlInline(inputFilePath, outputFilePath, ignore = []) {
    try {
        await pipeline(node_fs_1.default.createReadStream(inputFilePath, 'utf8'), new TransformStream(ignore), node_fs_1.default.createWriteStream(outputFilePath, 'utf8'));
        console.log('HTML modification completed.');
    }
    catch (error) {
        console.error('Error:', error);
    }
}
class TransformStream extends node_stream_1.default.Transform {
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
        const regex = /<link\s+[^>]*rel="stylesheet"[^>]*>|<style[^>]*>([\s\S]*?)<\/style>|<img\s+[^>]*src="([^"]+)"[^>]*>|<image\s+[^>]*href="([^"]+)"[^>]*\/?>|<video\s+[^>]*poster="([^"]+)"[^>]*>|<object\s+[^>]*data="([^"]+)"[^>]*>|<embed\s+[^>]*src="([^"]+)"[^>]*\/?>|<source\s+[^>]*src="([^"]+)"[^>]*>|<script\s+[^>]*src="([^"]+)"[^>]*><\/script>/gs;
        let lastIndex = 0;
        let match;
        while ((match = regex.exec(data))) {
            const tag = match[0];
            const inlineStyleMatch = tag.match(/<style[^>]*>([\s\S]*?)<\/style>/);
            const imgSrcMatch = tag.match(/<img[^>]*src="([^"]+)"[^>]*>/);
            const svgImageHrefMatch = tag.match(/<image[^>]*href="([^"]+)"[^>]*\/?>/);
            const videoPosterMatch = tag.match(/<video[^>]*poster="([^"]+)"[^>]*>/);
            const objectDataMatch = tag.match(/<object[^>]*data="([^"]+)"[^>]*>/);
            const embedSrcMatch = tag.match(/<embed[^>]*src="([^"]+)"[^>]*\/?>/);
            const videoSourceMatch = tag.match(/<source[^>]*src="([^"]+)"[^>]*>/);
            const cssHrefMatch = tag.match(/<link[^>]*href="([^"]+)"[^>]*>/);
            const jsSrcMatch = tag.match(/<script[^>]*src="([^"]+)"[^>]*><\/script>/);
            if (inlineStyleMatch) {
                if (!this.ignore.includes('stylesheets')) {
                    this.push(data.slice(lastIndex, match.index));
                    lastIndex = regex.lastIndex;
                    const styleContent = inlineStyleMatch[1];
                    const processedCss = await this.processCssUrls(styleContent);
                    this.push(`<style>${processedCss}</style>`);
                }
            }
            else if (imgSrcMatch) {
                if (!this.ignore.includes('images')) {
                    this.push(data.slice(lastIndex, match.index));
                    lastIndex = regex.lastIndex;
                    const imgSrc = imgSrcMatch[1];
                    const imgData = await this.readAndConvertImage(imgSrc);
                    if (imgData !== null) {
                        const inlinedTag = tag.replace(/src="[^"]*"/, `src="${imgData}"`);
                        this.push(inlinedTag);
                    }
                    else {
                        this.push(tag);
                    }
                }
            }
            else if (svgImageHrefMatch) {
                if (!this.ignore.includes('images')) {
                    this.push(data.slice(lastIndex, match.index));
                    lastIndex = regex.lastIndex;
                    const imageSrc = svgImageHrefMatch[1];
                    const imageData = await this.readAndConvertImage(imageSrc);
                    if (imageData !== null) {
                        const inlinedTag = tag.replace(/href="[^"]*"/, `href="${imageData}"`);
                        this.push(inlinedTag);
                    }
                    else {
                        this.push(tag);
                    }
                }
            }
            else if (videoPosterMatch) {
                if (!this.ignore.includes('images')) {
                    this.push(data.slice(lastIndex, match.index));
                    lastIndex = regex.lastIndex;
                    const posterSrc = videoPosterMatch[1];
                    const posterData = await this.readAndConvertImage(posterSrc);
                    if (posterData !== null) {
                        const inlinedTag = tag.replace(/poster="[^"]*"/, `poster="${posterData}"`);
                        this.push(inlinedTag);
                    }
                    else {
                        this.push(tag);
                    }
                }
            }
            else if (objectDataMatch) {
                if (!this.ignore.includes('images')) {
                    this.push(data.slice(lastIndex, match.index));
                    lastIndex = regex.lastIndex;
                    const objectSrc = objectDataMatch[1];
                    const objectData = await this.readAndConvertImage(objectSrc);
                    if (objectData !== null) {
                        const inlinedTag = tag.replace(/data="[^"]*"/, `data="${objectData}"`);
                        this.push(inlinedTag);
                    }
                    else {
                        this.push(tag);
                    }
                }
            }
            else if (embedSrcMatch) {
                if (!this.ignore.includes('images')) {
                    this.push(data.slice(lastIndex, match.index));
                    lastIndex = regex.lastIndex;
                    const embedSrc = embedSrcMatch[1];
                    const embedData = await this.readAndConvertImage(embedSrc);
                    if (embedData !== null) {
                        const inlinedTag = tag.replace(/src="[^"]*"/, `src="${embedData}"`);
                        this.push(inlinedTag);
                    }
                    else {
                        this.push(tag);
                    }
                }
            }
            else if (videoSourceMatch) {
                if (!this.ignore.includes('videos')) {
                    this.push(data.slice(lastIndex, match.index));
                    lastIndex = regex.lastIndex;
                    const videoSrc = videoSourceMatch[1];
                    const videoData = await this.readAndConvertVideo(videoSrc);
                    if (videoData !== null) {
                        const inlinedTag = tag.replace(/src="[^"]*"/, `src="${videoData}"`);
                        this.push(inlinedTag);
                    }
                    else {
                        this.push(tag);
                    }
                }
            }
            else if (cssHrefMatch) {
                if (!this.ignore.includes('stylesheets')) {
                    this.push(data.slice(lastIndex, match.index));
                    lastIndex = regex.lastIndex;
                    const cssFilePath = cssHrefMatch[1];
                    const cssContent = await this.fetchResource(cssFilePath);
                    if (cssContent !== null) {
                        const processedCss = await this.processCssUrls(cssContent);
                        this.push(`<style>${processedCss}</style>`);
                    }
                    else {
                        this.push(tag);
                    }
                }
            }
            else if (jsSrcMatch) {
                if (!this.ignore.includes('scripts')) {
                    this.push(data.slice(lastIndex, match.index));
                    lastIndex = regex.lastIndex;
                    const jsFilePath = jsSrcMatch[1];
                    const jsContent = await this.fetchResource(jsFilePath);
                    if (jsContent !== null) {
                        this.push(`<script>${jsContent}</script>`);
                    }
                    else {
                        this.push(tag);
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
     * Process CSS content and inline background-image URLs
     * @param css
     * @returns {Promise<string>}
     */
    async processCssUrls(css) {
        const urlRegex = /url\(['"]?([^'")]+)['"]?\)/g;
        let match;
        const replacements = [];
        while ((match = urlRegex.exec(css)) !== null) {
            const originalUrl = match[0];
            const imageUrl = match[1];
            // Skip data URIs that are already inlined
            if (imageUrl.startsWith('data:')) {
                continue;
            }
            const imageData = await this.readAndConvertImage(imageUrl);
            if (imageData !== null) {
                replacements.push({
                    original: originalUrl,
                    replacement: `url("${imageData}")`
                });
            }
        }
        // Apply all replacements
        let processedCss = css;
        for (const { original, replacement } of replacements) {
            processedCss = processedCss.replace(original, replacement);
        }
        return processedCss;
    }
    /**
     *
     * @param src
     * @returns {Promise<*|string>}
     */
    async fetchResource(src) {
        if (src.startsWith('http://') || src.startsWith('https://')) {
            try {
                const response = await axios_1.default.get(src);
                if (response.status === 200)
                    return response.data;
            }
            catch (error) {
                console.error('Error fetching resource: ', error);
                return null;
            }
        }
        else {
            try {
                return await readFileAsync(src, 'utf8');
            }
            catch (error) {
                console.error('Error reading file: ', error);
                return null;
            }
        }
        return null;
    }
    /**
     *
     * @param imgSrc
     * @returns {Promise<string>}
     */
    async readAndConvertImage(imgSrc) {
        if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
            try {
                let response = await axios_1.default.get(imgSrc, { responseType: 'arraybuffer' });
                if (response.status === 200) {
                    const prefix = `data:${response.headers['content-type']};base64,`;
                    return prefix + Buffer.from(response.data).toString('base64');
                }
            }
            catch (e) {
                console.error('Error fetching or converting image file: ', e);
                return null;
            }
        }
        else {
            try {
                const mimeType = mime_1.default.getType(imgSrc);
                if (!mimeType || !mimeType.startsWith('image/')) {
                    console.error('This is not an image file: ' + imgSrc);
                    return null;
                }
                const imgData = await readFileAsync(imgSrc);
                const base64Image = Buffer.from(imgData).toString('base64');
                return `data:${mimeType};base64,${base64Image}`;
            }
            catch (error) {
                console.error('Error reading file: ', error);
                return null;
            }
        }
        return null;
    }
    /**
     *
     * @param videoSrc
     * @returns {Promise<string>}
     */
    async readAndConvertVideo(videoSrc) {
        if (videoSrc.startsWith('http://') || videoSrc.startsWith('https://')) {
            try {
                let response = await axios_1.default.get(videoSrc, { responseType: 'arraybuffer' });
                if (response.status === 200) {
                    const prefix = `data:${response.headers['content-type']};base64,`;
                    return prefix + Buffer.from(response.data).toString('base64');
                }
            }
            catch (e) {
                console.error('Error fetching or converting video file: ', e);
                return null;
            }
        }
        else {
            try {
                const mimeType = mime_1.default.getType(videoSrc);
                if (!mimeType || !mimeType.startsWith('video/')) {
                    console.error('This is not a video file: ' + videoSrc);
                    return null;
                }
                const videoData = await readFileAsync(videoSrc);
                const base64Video = Buffer.from(videoData).toString('base64');
                return `data:${mimeType};base64,${base64Video}`;
            }
            catch (error) {
                console.error('Error reading file: ', error);
                return null;
            }
        }
        return null;
    }
}
//# sourceMappingURL=async-html-inline.js.map