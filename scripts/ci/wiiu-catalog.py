# Lists the Wii U Homebrew App Store catalog (the one CosmoU's Wii U shop uses) as a short table.
# usage: python3 wiiu-catalog.py <out.md>
import json, sys, urllib.request
req = urllib.request.Request('https://wiiu.cdn.fortheusers.org/repo.json', headers={'User-Agent': 'CosmoU-WiiU-shop-test'})
data = json.load(urllib.request.urlopen(req, timeout=60))
pk = data['packages']
cats = {}
for p in pk: cats[p.get('category', '?')] = cats.get(p.get('category', '?'), 0) + 1
lines = [f'{len(pk)} packages; categories: {cats}', 'keys: ' + ','.join(sorted(pk[0].keys())), '']
for p in sorted(pk, key=lambda p: (p.get('category', ''), p['name'])):
    lines.append('\t'.join(str(p.get(k, '')) for k in ('category', 'name', 'title', 'version', 'filesize', 'binary')) + '\t' + str(p.get('description', ''))[:70])
open(sys.argv[1], 'w').write('\n'.join(lines)[:64000])
print('\n'.join(lines[:3]))
