# async-html-inline

Asynchronously inline javascript, stylesheets, and images to an html page. Uses streams for efficient data handling.
Can inline resources served from local environment and from external URLs.


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

See the example Folder ...


## License

Copyright (c) 2023 Florian Walzel,
MIT License

