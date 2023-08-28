import { asyncHtmlInline } from '../async-html-inline.mjs';

(async function() {
  await asyncHtmlInline('input.html', 'output.html', []);
  console.log(`Your inlined html is ready in /example/output.html`)
})();