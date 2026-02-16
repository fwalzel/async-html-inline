#!/usr/bin/env node

import { asyncHtmlInline } from '../dist/async-html-inline.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function printHelp() {
  console.log(`
Usage: html-inline <input> <output> [options]

Arguments:
  <input>       Path to input HTML file
  <output>      Path to output HTML file

Options:
  --ignore-stylesheets    Skip inlining CSS stylesheets
  --ignore-scripts        Skip inlining JavaScript files
  --ignore-images         Skip inlining images
  --ignore-videos         Skip inlining video files
  --ignore-fonts          Skip inlining font files
  --help, -h              Show this help message

Examples:
  html-inline input.html output.html
  html-inline input.html output.html --ignore-images
  html-inline input.html output.html --ignore-stylesheets --ignore-scripts
  html-inline input.html output.html --ignore-fonts --ignore-videos
`);
}

export async function cli(argv) {
  const args = argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  if (args.length < 2) {
    console.error('\x1b[31m%s\x1b[0m', 'Error: Both input and output file paths are required.');
    printHelp();
    process.exit(1);
  }

  const ignore = [];

  if (args.includes('--ignore-stylesheets')) {
    ignore.push('stylesheets');
  }
  if (args.includes('--ignore-scripts')) {
    ignore.push('scripts');
  }
  if (args.includes('--ignore-images')) {
    ignore.push('images');
  }
  if (args.includes('--ignore-videos')) {
    ignore.push('videos');
  }
  if (args.includes('--ignore-fonts')) {
    ignore.push('fonts');
  }

  const input = path.resolve(args[0]);
  const output = path.resolve(args[1]);

  try {
    await asyncHtmlInline(input, output, ignore);
    console.log('\x1b[32m%s\x1b[0m', `✓ Inlined successfully! Output: ${output}`);
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `Error: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  cli(process.argv);
}
