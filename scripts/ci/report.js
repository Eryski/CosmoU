// Shows the end-to-end results on GitHub: a check named "CosmoU test (<system>)" on the commit, with every
// result in its text and the screenshots (*.jpg) as notes, so they can be read without downloading anything.
// usage: node report.js <e2e folder> <name>     needs GITHUB_TOKEN, GITHUB_REPOSITORY, GITHUB_SHA
const fs = require('fs'),
  path = require('path');
const dir = process.argv[2],
  name = 'CosmoU test (' + (process.argv[3] || process.platform) + ')';

async function gh(method, url, body) {
  const r = await fetch('https://api.github.com/repos/' + process.env.GITHUB_REPOSITORY + url, {
    method,
    headers: {
      Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(method + ' ' + url + ' → HTTP ' + r.status + ' ' + (await r.text()).slice(0, 300));
  return r.json();
}

(async () => {
  let r = {};
  try {
    r = JSON.parse(fs.readFileSync(path.join(dir, 'results.json'), 'utf8'));
  } catch (e) {
    r = { crash: 'no results.json: ' + e.message, results: [] };
  }
  const res = r.results || [];
  const failed = res.filter(x => !x.pass).length;
  const lines = res.map(x => (x.pass ? 'PASS ' : 'FAIL ') + x.name + (x.detail ? '  ' + x.detail.slice(0, 900) : ''));
  if (r.crash) lines.push('CRASH ' + r.crash);
  // what the test printed (when there is a log next to the results)
  try {
    const log = fs.readFileSync(path.join(dir, 'test.log'), 'utf8').trim().split('\n');
    if (r.crash || res.some(x => !x.pass)) lines.push('--- test log ---', ...log.slice(-60));
  } catch {}
  for (const e of r.errs || []) lines.push('LOG ' + e.slice(0, 400));
  console.log(lines.join('\n'));
  const shots = [];
  try {
    for (const f of fs
      .readdirSync(dir)
      .filter(f => /\.jpg$/.test(f))
      .sort()) {
      const b = fs.readFileSync(path.join(dir, f)).toString('base64');
      if (b.length < 64000) shots.push({ f, b });
      else lines.push('SHOT TOO BIG ' + f + ' ' + b.length);
    }
  } catch {}
  const ann = shots.map(s => ({
    path: 'scripts/ci/e2e.js',
    start_line: 1,
    end_line: 1,
    annotation_level: 'notice',
    title: 'shot ' + s.f,
    message: s.b,
  }));
  const summary =
    (r.platform || '') +
    ' ' +
    (r.arch || '') +
    ': ' +
    (res.length - failed) +
    ' passed, ' +
    failed +
    ' failed' +
    (r.crash ? ', crashed' : '');
  const run = await gh('POST', '/check-runs', {
    name,
    head_sha: process.env.GITHUB_SHA,
    status: 'completed',
    conclusion: failed || r.crash ? 'failure' : 'success',
    output: { title: summary, summary, text: '```\n' + lines.join('\n').slice(0, 60000) + '\n```', annotations: ann.slice(0, 50) },
  });
  console.log('check run', run.id, summary);
})().catch(e => {
  console.log('report failed: ' + e.message);
});
