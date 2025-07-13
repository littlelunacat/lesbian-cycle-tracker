const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const basePath = '/lesbian-cycle-tracker';

function fixPathsInFile(filePath) {
  console.log(`Processing: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix href attributes
  content = content.replace(/href="\//g, `href="${basePath}/`);
  
  // Fix src attributes
  content = content.replace(/src="\//g, `src="${basePath}/`);
  
  // Fix url() in CSS - be more careful to avoid double paths
  content = content.replace(/url\(\/(?!lesbian-cycle-tracker\/)/g, `url(${basePath}/`);
  
  // Fix data URLs and other absolute paths
  content = content.replace(/url\(([^)]*)\/(?!lesbian-cycle-tracker\/)/g, (match, p1) => {
    if (p1.startsWith('data:')) return match; // Don't change data URLs
    return `url(${p1}${basePath}/`;
  });
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Fixed paths in: ${filePath}`);
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.html')) {
      fixPathsInFile(filePath);
    }
  }
}

console.log('Starting to fix asset paths for GitHub Pages...');
processDirectory(distDir);
console.log('Asset path fixing complete!'); 