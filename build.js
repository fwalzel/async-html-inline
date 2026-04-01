const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Building TypeScript files...');

// Clean dist folder
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

// Build ESM version (.mjs)
console.log('Building ESM version...');
execSync('tsc --module ES2020 --outDir dist', { stdio: 'inherit' });

// Rename .js to .mjs for ESM
const distFiles = fs.readdirSync('dist');
distFiles.forEach(file => {
  if (file.endsWith('.js') && !file.endsWith('.d.ts')) {
    const oldPath = path.join('dist', file);
    const newPath = path.join('dist', file.replace('.js', '.mjs'));
    fs.renameSync(oldPath, newPath);
    console.log(`Renamed ${file} to ${file.replace('.js', '.mjs')}`);
  }
});

// Build CommonJS version (.js)
console.log('Building CommonJS version...');
execSync('tsc --module commonjs --outDir dist', { stdio: 'inherit' });

console.log('Build completed successfully!');
