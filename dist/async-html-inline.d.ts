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
declare function asyncHtmlInline(inputFilePath: string, outputFilePath: string, ignore?: string[]): Promise<void>;
export { asyncHtmlInline };
//# sourceMappingURL=async-html-inline.d.ts.map