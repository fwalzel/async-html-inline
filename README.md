# async-html-inline

Asynchronously inline javascript, stylesheets, and images to an html page.

Can inline resources served from local environment and from external URLs. Uses streams for efficient data handling, supports typescript.

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

You can ignore specific resources from being inlined by passing a third argument. Use an array with resources to be excluded as it’s elements.

```javascript
const ignore = ['stylesheets', 'scripts'];
await asyncHtmlInline('input.html', 'output.html', ignore);
```

The elements of the ignore array can be `stylesheets`, `scripts`, `images`.


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

Ignore multiple resource types:
```bash
html-inline input.html output.html --ignore-stylesheets --ignore-scripts
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

Happy Coding.

## License

Copyright (c) 2023–26 Florian Walzel,
MIT License
