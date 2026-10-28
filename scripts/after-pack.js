// electron-builder afterPack hook.
// Linux: the program "cosmou" becomes a small launcher script (build/linux/cosmou-launcher.sh)
// that starts the real Electron program "cosmou-bin".
// macOS: CosmoU has no paid Apple certificate, so the finished app gets an "ad-hoc" signature.
// Without any signature macOS on Apple silicon refuses to start it ("CosmoU is damaged").
const fs = require('fs'),
  path = require('path'),
  { execFileSync } = require('child_process');

exports.default = async function (context) {
  if (context.electronPlatformName === 'linux') return linux(context);
  if (context.electronPlatformName === 'darwin') return mac(context);
};

function linux(context) {
  const name = context.packager.executableName,
    dir = context.appOutDir,
    exe = path.join(dir, name),
    bin = path.join(dir, 'cosmou-bin');
  if (!fs.existsSync(exe)) throw new Error('afterPack: ' + exe + ' not found');
  fs.renameSync(exe, bin);
  fs.copyFileSync(path.join(__dirname, '..', 'build', 'linux', 'cosmou-launcher.sh'), exe);
  fs.chmodSync(exe, 0o755);
  fs.chmodSync(bin, 0o755);
}

function mac(context) {
  // a universal build packs an Intel and an Apple silicon app first (folders ending in -temp) and joins them;
  // only the finished app needs the signature
  if (/-temp$/.test(context.appOutDir)) return;
  const app = path.join(context.appOutDir, context.packager.appInfo.productFilename + '.app');
  if (!fs.existsSync(app)) throw new Error('afterPack: ' + app + ' not found');
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' });
  execFileSync('codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' });
  console.log('  • ad-hoc signed ' + app);
}
