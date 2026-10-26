// Builds a single-file browser preview (no Cemu, demo games) from index.html + css/ + js/.
// Usage: node scripts/build-preview.js [out.html]
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const out = process.argv[2] || path.join(root, 'dist', 'cosmou-preview.html');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="([^"]+)"\s*\/?>/g, (_, f) => '<style>\n' + fs.readFileSync(path.join(root, f), 'utf8') + '</style>');
html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, f) => '<script>\n' + fs.readFileSync(path.join(root, f), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log('wrote', out);
