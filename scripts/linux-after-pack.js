// electron-builder afterPack hook: on Linux the program "cosmou" becomes a small launcher script
// (build/linux/cosmou-launcher.sh) that starts the real Electron program "cosmou-bin".
const fs = require('fs'),
  path = require('path');
exports.default = async function (context) {
  if (context.electronPlatformName !== 'linux') return;
  const name = context.packager.executableName,
    dir = context.appOutDir,
    exe = path.join(dir, name),
    bin = path.join(dir, 'cosmou-bin');
  if (!fs.existsSync(exe)) throw new Error('afterPack: ' + exe + ' not found');
  fs.renameSync(exe, bin);
  fs.copyFileSync(path.join(__dirname, '..', 'build', 'linux', 'cosmou-launcher.sh'), exe);
  fs.chmodSync(exe, 0o755);
  fs.chmodSync(bin, 0o755);
};
