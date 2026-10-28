// Shows the end-to-end results on the GitHub Actions run page (as notes on the run).
// usage: node report.js <e2e folder> [first screenshot number] [last screenshot number]
// Screenshots (*.jpg next to the *.png) are added as base64 notes, so they can be read without downloading anything.
const fs = require('fs'),
  path = require('path');
const dir = process.argv[2],
  from = Number(process.argv[3] || 0),
  to = Number(process.argv[4] || 0);
const esc = s => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const note = (title, msg) => console.log(`::notice title=${esc(title).replace(/[:,]/g, ' ')}::${esc(msg)}`);

if (!from) {
  let r;
  try {
    r = JSON.parse(fs.readFileSync(path.join(dir, 'results.json'), 'utf8'));
  } catch (e) {
    note('e2e results', 'no results.json: ' + e.message);
    process.exit(0);
  }
  const lines = (r.results || []).map(x => (x.pass ? 'PASS ' : 'FAIL ') + x.name + (x.detail ? '  ' + x.detail.slice(0, 700) : ''));
  if (r.crash) lines.push('CRASH ' + r.crash);
  for (const e of r.errs || []) lines.push('LOG ' + e.slice(0, 300));
  const failed = (r.results || []).filter(x => !x.pass).length;
  note(
    'e2e ' + (r.platform || '') + ' ' + (r.arch || '') + (failed || r.crash ? ' FAILED ' + failed : ' all passed'),
    lines.join('\n').slice(0, 60000),
  );
} else {
  const shots = fs
    .readdirSync(dir)
    .filter(f => /^\d\d-.*\.jpg$/.test(f))
    .sort()
    .filter(f => +f.slice(0, 2) >= from && +f.slice(0, 2) <= to);
  for (const f of shots) note('shot ' + f, fs.readFileSync(path.join(dir, f)).toString('base64'));
}
