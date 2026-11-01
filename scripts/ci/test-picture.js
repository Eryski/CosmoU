// A test picture for the background-picture tests: a sky-to-sea gradient with a sun, written as a PNG (no packages).
const fs = require('fs'),
  zlib = require('zlib');
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = b => {
  let c = 0xffffffff;
  for (const x of b) c = crcTable[(c ^ x) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type, data) {
  const len = Buffer.alloc(4),
    sum = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  sum.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, sum]);
}
module.exports = function testPicture(file, w = 640, h = 360) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const t = y / h,
        sea = y > h * 0.55;
      let r = sea ? 30 : 120 + 100 * t,
        g = sea ? 110 : 190 + 40 * t,
        b = sea ? 190 : 250;
      if ((x - w * 0.72) ** 2 + (y - h * 0.3) ** 2 < (h * 0.12) ** 2) (r = 255), (g = 220), (b = 90);
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  fs.writeFileSync(
    file,
    Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]),
  );
  return file;
};
