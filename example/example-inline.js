const { asyncHtmlInline } = require('../async-html-inline.js');

(async function() {
  await asyncHtmlInline('expl/input.html', 'output.html', []);
  console.log(`Your inlined html is ready in /example/output.html`)
})();