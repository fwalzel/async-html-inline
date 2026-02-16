# async-html-inline

Asynchronously inline external resources (JavaScript, CSS, images, videos, fonts) into a single HTML file.

Converts all external resource references to base64 data URIs, creating a self-contained HTML file. Supports resources from both local file system and external URLs. Uses streams for efficient data handling and includes full TypeScript support.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Build](https://github.com/fwalzel/async-html-inline/actions/workflows/node.js.yml/badge.svg)](https://github.com/fwalzel/async-html-inline/actions/workflows/node.js.yml/badge.svg)
![Node.js Version](https://img.shields.io/badge/Node.js-16.x-green)
[![Known Vulnerabilities](https://snyk.io/test/github/fwalzel/async-html-inline/badge.svg)](https://snyk.io/test/github/fwalzel/async-html-inline/badge.svg)

## Install

```bash
npm install async-html-inline
```


## Import

As CommonJS:

```javascript
const { asyncHtmlInline } = require('async-html-inline');
```

As ES Module:

```javascript
import { asyncHtmlInline } from 'async-html-inline';
```


## What Can Be Inlined?

`async-html-inline` supports inlining the following resource types:

| Resource Type | HTML Tags / CSS Properties | Output Format |
|---------------|---------------------------|---------------|
| **Stylesheets** | `<link rel="stylesheet" href="...">` | Inline `<style>` tags |
| **JavaScript** | `<script src="..."></script>` | Inline `<script>` tags |
| **Images** | `<img src="...">` | Base64 data URI in `src` attribute |
| **SVG Images** | `<image href="...">` (SVG element) | Base64 data URI in `href` attribute |
| **Video Posters** | `<video poster="...">` | Base64 data URI in `poster` attribute |
| **Video Sources** | `<source src="...">` (within `<video>`) | Base64 data URI in `src` attribute |
| **Object Data** | `<object data="...">` | Base64 data URI in `data` attribute |
| **Embed Sources** | `<embed src="...">` | Base64 data URI in `src` attribute |
| **CSS Background Images** | `background-image: url(...)` | Base64 data URI in CSS |
| **Fonts** | `@font-face { src: url(...) }` | Base64 data URI in CSS |
| **Font Imports** | `<link href="fonts.googleapis.com">` or `@import url('fonts.googleapis.com')` | Inline `<style>` with embedded fonts |

### Supported File Formats

- **Images**: JPG, PNG, GIF, SVG, WebP, BMP, ICO, TIFF
- **Videos**: MP4, WebM, OGG
- **Fonts**: WOFF, WOFF2, TTF, OTF, EOT
- **Stylesheets**: CSS (including preprocessed CSS)
- **Scripts**: JavaScript (including ES modules)

### Resource Sources

- **Local files**: Relative or absolute file paths
- **Remote URLs**: HTTP/HTTPS resources from any domain
- **CDN resources**: Google Fonts, Bootstrap CDN, etc.

## Usage

```javascript
(async function() {
  await asyncHtmlInline('input.html', 'output.html');
})();
```

The input.html like this

```html
<html>
<head>
  <title>Example inlined</title>
  <link rel="stylesheet" href="styles.css" />
  <script src="hello.js"></script>
<body>
    <img src="https://avatars.githubusercontent.com/u/2675925?v=4">
</body>
</html>
```

renders to the output.html

```html
<html>
<head>
  <title>Example inlined</title>
  <style>.red {
    color: red;
  }</style>
  <script>console.log('hello world');</script>
<body>
    <img src="data:image/jpeg;base64,/9j/2wCEAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBk.../UUAf/2Q==" />
</body>
</html>
```

### Exclusions

You can selectively exclude specific resource types from being inlined by passing an array as the third argument.

### Available Exclusion Options

| Option | Description | Excludes |
|--------|-------------|----------|
| `'stylesheets'` | Skip CSS stylesheets | `<link rel="stylesheet">`, `<style>` tags |
| `'scripts'` | Skip JavaScript files | `<script src="...">` |
| `'images'` | Skip all images | `<img>`, `<image>`, `<video poster>`, `<object>`, `<embed>`, CSS `background-image` |
| `'videos'` | Skip video files | `<source src="...">` within `<video>` tags |
| `'fonts'` | Skip font files | Font URLs in `@font-face`, Google Fonts, `@import` for fonts |

### Examples

Exclude stylesheets and scripts:
```javascript
const ignore = ['stylesheets', 'scripts'];
await asyncHtmlInline('input.html', 'output.html', ignore);
```

Exclude only videos (useful for large video files):
```javascript
const ignore = ['videos'];
await asyncHtmlInline('input.html', 'output.html', ignore);
```

Exclude fonts and videos:
```javascript
const ignore = ['fonts', 'videos'];
await asyncHtmlInline('input.html', 'output.html', ignore);
```

Inline everything (default behavior):
```javascript
await asyncHtmlInline('input.html', 'output.html');
// or explicitly
await asyncHtmlInline('input.html', 'output.html', []);
```


## CLI Usage

You can also use `async-html-inline` from the command line.

### Installation

Install globally to use the CLI:

```bash
npm install -g async-html-inline
```

### Basic Usage

```bash
html-inline <input> <output>
```

Example:

```bash
html-inline input.html output.html
```

### Options

**`--ignore-stylesheets`** - Skip inlining CSS stylesheets

**`--ignore-scripts`** - Skip inlining JavaScript files

**`--ignore-images`** - Skip inlining images

**`--ignore-videos`** - Skip inlining video files

**`--ignore-fonts`** - Skip inlining font files

**`--help, -h`** - Show help message

### Examples

Inline all resources:
```bash
html-inline input.html output.html
```

Ignore images from being inlined:
```bash
html-inline input.html output.html --ignore-images
```

Ignore videos (useful for large video files):
```bash
html-inline input.html output.html --ignore-videos
```

Ignore fonts (keep external font links):
```bash
html-inline input.html output.html --ignore-fonts
```

Ignore multiple resource types:
```bash
html-inline input.html output.html --ignore-stylesheets --ignore-scripts
html-inline input.html output.html --ignore-fonts --ignore-videos
```

Display help:
```bash
html-inline --help
```


## Example

In this repo do

```bash
npm run example
```

and see the output.html in the `example` folder.

## Tests

To perform unit tests run

```bash
npm test
```

Happy Coding.

## License

Copyright (c) 2023–26 Florian Walzel,
MIT License
