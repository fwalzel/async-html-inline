import { expect } from 'chai';
import { asyncHtmlInline } from '../dist/async-html-inline.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(__dirname, 'fixtures');
const outputDir = path.join(__dirname, 'output');

// Helper function to prepare HTML fixtures with absolute paths
function prepareFixture(fixtureName) {
  const fixturePath = path.join(fixturesDir, fixtureName);
  const content = fs.readFileSync(fixturePath, 'utf8');
  const processedContent = content.replace(/__FIXTURES_DIR__/g, fixturesDir);
  const tempPath = path.join(outputDir, `temp-${fixtureName}`);
  fs.writeFileSync(tempPath, processedContent);
  return tempPath;
}

describe('async-html-inline', function() {
  this.timeout(10000);

  before(() => {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  });

  after(() => {
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true });
    }
  });

  describe('Inclusion Tests', () => {
    it('should inline CSS stylesheets', async () => {
      const input = prepareFixture('complete.html');
      const output = path.join(outputDir, 'css-inlined.html');
      
      await asyncHtmlInline(input, output);
      
      const result = fs.readFileSync(output, 'utf8');
      expect(result).to.include('<style>');
      expect(result).to.include('.test-class');
      expect(result).to.not.include('<link rel="stylesheet"');
    });

    it('should inline JavaScript files', async () => {
      const input = prepareFixture('complete.html');
      const output = path.join(outputDir, 'js-inlined.html');
      
      await asyncHtmlInline(input, output);
      
      const result = fs.readFileSync(output, 'utf8');
      expect(result).to.include('<script>');
      expect(result).to.include('testFunction');
      expect(result).to.not.include('<script src=');
    });

    it('should inline images with base64 data URIs', async () => {
      const input = prepareFixture('complete.html');
      const output = path.join(outputDir, 'img-inlined.html');
      
      await asyncHtmlInline(input, output);
      
      const result = fs.readFileSync(output, 'utf8');
      expect(result).to.include('src="data:image/svg+xml;base64,');
    });

    it('should inline video poster images', async () => {
      const input = prepareFixture('complete.html');
      const output = path.join(outputDir, 'poster-inlined.html');
      
      await asyncHtmlInline(input, output);
      
      const result = fs.readFileSync(output, 'utf8');
      expect(result).to.include('poster="data:image/svg+xml;base64,');
    });

    it('should inline video sources', async () => {
      const input = prepareFixture('complete.html');
      const output = path.join(outputDir, 'video-inlined.html');
      
      await asyncHtmlInline(input, output);
      
      const result = fs.readFileSync(output, 'utf8');
      expect(result).to.include('src="data:video/');
    });

    it('should inline object data', async () => {
      const input = prepareFixture('complete.html');
      const output = path.join(outputDir, 'object-inlined.html');
      
      await asyncHtmlInline(input, output);
      
      const result = fs.readFileSync(output, 'utf8');
      expect(result).to.include('data="data:image/svg+xml;base64,');
    });

    it('should inline embed sources', async () => {
      const input = prepareFixture('complete.html');
      const output = path.join(outputDir, 'embed-inlined.html');
      
      await asyncHtmlInline(input, output);
      
      const result = fs.readFileSync(output, 'utf8');
      expect(result).to.match(/<embed[^>]*src="data:image\/svg\+xml;base64,/);
    });
  });

  describe('Exclusion Tests', () => {
    it('should exclude stylesheets when --ignore-stylesheets is set', async () => {
      const input = prepareFixture('complete.html');
      const output = path.join(outputDir, 'no-css.html');
      
      await asyncHtmlInline(input, output, ['stylesheets']);
      
      const result = fs.readFileSync(output, 'utf8');
      expect(result).to.include('<link rel="stylesheet"');
      expect(result).to.not.include('<style>.test-class');
    });

    it('should exclude scripts when --ignore-scripts is set', async () => {
      const input = prepareFixture('complete.html');
      const output = path.join(outputDir, 'no-js.html');
      
      await asyncHtmlInline(input, output, ['scripts']);
      
      const result = fs.readFileSync(output, 'utf8');
      expect(result).to.include('<script src=');
      expect(result).to.not.include('testFunction');
    });

    it('should exclude images when --ignore-images is set', async () => {
      const input = prepareFixture('complete.html');
      const output = path.join(outputDir, 'no-images.html');
      
      await asyncHtmlInline(input, output, ['images']);
      
      const result = fs.readFileSync(output, 'utf8');
      expect(result).to.not.include('src="data:image/svg+xml;base64,');
      expect(result).to.not.include('poster="data:image/svg+xml;base64,');
    });

    it('should exclude videos when --ignore-videos is set', async () => {
      const input = prepareFixture('complete.html');
      const output = path.join(outputDir, 'no-videos.html');
      
      await asyncHtmlInline(input, output, ['videos']);
      
      const result = fs.readFileSync(output, 'utf8');
      expect(result).to.include('src="https://www.w3schools.com/html/mov_bbb.mp4"');
      expect(result).to.not.include('src="data:video/');
      // Poster should still be inlined (it's an image, not a video)
      expect(result).to.include('poster="data:image/svg+xml;base64,');
    });

    it('should exclude multiple resource types', async () => {
      const input = prepareFixture('complete.html');
      const output = path.join(outputDir, 'multiple-exclusions.html');
      
      await asyncHtmlInline(input, output, ['stylesheets', 'scripts', 'videos']);
      
      const result = fs.readFileSync(output, 'utf8');
      expect(result).to.include('<link rel="stylesheet"');
      expect(result).to.include('<script src=');
      expect(result).to.include('src="https://www.w3schools.com/html/mov_bbb.mp4"');
      // Images should still be inlined
      expect(result).to.include('src="data:image/svg+xml;base64,');
    });
  });

  describe('Attribute Preservation Tests', () => {
    it('should preserve all attributes on img tags', async () => {
      const input = prepareFixture('attributes.html');
      const output = path.join(outputDir, 'img-attributes.html');
      
      await asyncHtmlInline(input, output);
      
      const result = fs.readFileSync(output, 'utf8');
      expect(result).to.include('id="img-1"');
      expect(result).to.include('alt="Alt text"');
      expect(result).to.include('class="img-class"');
      expect(result).to.include('style="border: 1px solid red;"');
      expect(result).to.include('data-test="value"');
      expect(result).to.include('width="100"');
      expect(result).to.include('height="100"');
      expect(result).to.include('src="data:image/svg+xml;base64,');
    });

    it('should preserve all attributes on video tags', async () => {
      const input = prepareFixture('attributes.html');
      const output = path.join(outputDir, 'video-attributes.html');
      
      await asyncHtmlInline(input, output);
      
      const result = fs.readFileSync(output, 'utf8');
      expect(result).to.include('id="vid-1"');
      expect(result).to.include('controls');
      expect(result).to.include('width="400"');
      expect(result).to.include('class="video-class"');
      expect(result).to.include('data-video="test"');
      expect(result).to.include('poster="data:image/svg+xml;base64,');
    });

    it('should preserve all attributes on source tags', async () => {
      const input = prepareFixture('attributes.html');
      const output = path.join(outputDir, 'source-attributes.html');
      
      await asyncHtmlInline(input, output);
      
      const result = fs.readFileSync(output, 'utf8');
      expect(result).to.include('id="src-1"');
      expect(result).to.include('type="video/mp4"');
      expect(result).to.include('data-quality="hd"');
      expect(result).to.include('class="source-class"');
      expect(result).to.include('src="data:video/');
    });

    it('should preserve attributes on object and embed tags', async () => {
      const input = prepareFixture('complete.html');
      const output = path.join(outputDir, 'object-embed-attributes.html');
      
      await asyncHtmlInline(input, output);
      
      const result = fs.readFileSync(output, 'utf8');
      expect(result).to.include('id="test-object"');
      expect(result).to.include('class="object-class"');
      expect(result).to.include('type="image/svg+xml"');
      expect(result).to.include('id="test-embed"');
      expect(result).to.include('class="embed-class"');
    });
  });

  describe('Error Handling', () => {
    it('should preserve original tag if resource cannot be fetched', async () => {
      const input = path.join(fixturesDir, 'complete.html');
      const output = path.join(outputDir, 'error-handling.html');
      
      const testHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Error Test</title>
</head>
<body>
  <img src="non-existent-file.png" alt="Missing">
</body>
</html>`;
      
      const errorInput = path.join(outputDir, 'error-input.html');
      fs.writeFileSync(errorInput, testHtml);
      
      await asyncHtmlInline(errorInput, output);
      
      const result = fs.readFileSync(output, 'utf8');
      expect(result).to.include('src="non-existent-file.png"');
      expect(result).to.include('alt="Missing"');
    });
  });

  describe('Integration Tests', () => {
    it('should inline all resources by default', async () => {
      const input = prepareFixture('complete.html');
      const output = path.join(outputDir, 'all-inlined.html');
      
      await asyncHtmlInline(input, output);
      
      const result = fs.readFileSync(output, 'utf8');
      
      // Check that all resources are inlined
      expect(result).to.include('<style>');
      expect(result).to.include('<script>');
      expect(result).to.include('src="data:image/svg+xml;base64,');
      expect(result).to.include('poster="data:image/svg+xml;base64,');
      expect(result).to.include('src="data:video/');
      expect(result).to.include('data="data:image/svg+xml;base64,');
      
      // Check that external references are removed
      expect(result).to.not.include('<link rel="stylesheet"');
      expect(result).to.not.include('<script src=');
    });

    it('should create a self-contained HTML file', async () => {
      const input = prepareFixture('complete.html');
      const output = path.join(outputDir, 'self-contained.html');
      
      await asyncHtmlInline(input, output);
      
      const result = fs.readFileSync(output, 'utf8');
      
      // Verify CSS and JS are inlined
      expect(result).to.include('<style>');
      expect(result).to.include('.test-class');
      expect(result).to.include('testFunction');
      
      // Verify images are inlined
      expect(result).to.include('src="data:image/svg+xml;base64,');
      expect(result).to.include('poster="data:image/svg+xml;base64,');
      expect(result).to.include('data="data:image/svg+xml;base64,');
    });
  });
});
