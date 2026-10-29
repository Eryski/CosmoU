// Puts the important lines of a build log on the GitHub run page as a note (when a build step failed).
// usage: node log-note.js <log file> [title]
const fs = require('fs');
let t = '';
try {
  t = fs.readFileSync(process.argv[2], 'utf8');
} catch (e) {
  t = 'no log: ' + e.message;
}
const lines = t.split('\n');
const keep = [];
lines.forEach((l, i) => {
  if (/error|What went wrong|FAILURE|failed|Exception|warning: \[|e: /i.test(l)) keep.push(...lines.slice(i, i + 4));
});
const out = (keep.length ? keep : lines.slice(-80)).filter((l, i, a) => a.indexOf(l) === i).slice(0, 150).join('\n');
const esc = s => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
console.log('::error title=' + (process.argv[3] || 'build log') + '::' + esc(out.slice(-30000)));
