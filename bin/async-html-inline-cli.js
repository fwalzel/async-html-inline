const path = require('path');
const { asyncHtmlInline } = require('../async-html-inline.js');

const cli = async function(argv) {
  const ignore = [];

  if (argv.indexOf('--stylesheets') > -1)
    ignore.push('stylesheets');
  if (argv.indexOf('--scripts') > -1)
    ignore.push('scripts');
  if (argv.indexOf('--images') > -1)
    ignore.push('images');

  const input = path.join(__dirname, argv[2]);
  const output = path.join(__dirname, argv[3]);

  await asyncHtmlInline(input, output, ignore);
  console.log('\x1b[32m%s\x1b[0m', `Inlined, done, and ready! Your output is here: ${argv[3]}`);
};

module.exports.cli = cli;