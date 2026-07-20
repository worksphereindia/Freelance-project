const fs = require('fs');
const path = require('path');
const srcDir = path.join(process.cwd(), 'src');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      results.push(file);
    }
  });
  return results;
}

const allFiles = walk(srcDir);
const fileMap = new Map();
allFiles.forEach(f => fileMap.set(f.toLowerCase(), f));

let hasError = false;

allFiles.forEach(f => {
  if (f.endsWith('.js') || f.endsWith('.jsx')) {
    const content = fs.readFileSync(f, 'utf8');
    const regex = /from\s+['"](\.[^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      const importPath = match[1];
      const ext = path.extname(importPath);
      
      let resolvedPath;
      if (ext) {
        resolvedPath = path.resolve(path.dirname(f), importPath);
      } else {
        const possibleExts = ['.jsx', '.js', '.css', ''];
        for (const e of possibleExts) {
          const p = path.resolve(path.dirname(f), importPath + e);
          if (fileMap.has(p.toLowerCase())) {
            resolvedPath = p;
            break;
          }
        }
        if(!resolvedPath) {
          const p = path.resolve(path.dirname(f), importPath, 'index.jsx');
          if (fileMap.has(p.toLowerCase())) resolvedPath = p;
        }
      }
      
      if (resolvedPath && fileMap.has(resolvedPath.toLowerCase())) {
        const actualPath = fileMap.get(resolvedPath.toLowerCase());
        if (resolvedPath !== actualPath) {
          console.error('Case mismatch in ' + f + ':\nimported: ' + resolvedPath + '\nactual:   ' + actualPath);
          hasError = true;
        }
      }
    }
  }
});
if (!hasError) console.log('No case mismatches found.');
