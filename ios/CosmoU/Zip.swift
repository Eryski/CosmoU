// Just enough zip for .cosmoutheme files: reading (stored and deflated entries) and writing (stored entries).
import Compression
import Foundation

enum Zip {
    struct Entry {
        let name: String
        let method: UInt16
        let compressed: Int
        let size: Int
        let offset: Int
    }

    final class Reader {
        let entries: [Entry]
        private let d: Data

        init?(_ url: URL) {
            guard let d = try? Data(contentsOf: url, options: .mappedIfSafe), d.count >= 22 else { return nil }
            self.d = d
            // the end of the central directory is in the last 64 KB
            var eocd = -1
            var i = d.count - 22
            let stop = max(0, d.count - 65557)
            while i >= stop {
                if Zip.u32(d, i) == 0x0605_4B50 { eocd = i; break }
                i -= 1
            }
            guard eocd >= 0 else { return nil }
            let count = Int(Zip.u16(d, eocd + 10))
            var p = Int(Zip.u32(d, eocd + 16))
            var list: [Entry] = []
            for _ in 0..<count {
                guard p + 46 <= d.count, Zip.u32(d, p) == 0x0201_4B50 else { return nil }
                let method = Zip.u16(d, p + 10)
                let csize = Int(Zip.u32(d, p + 20)), size = Int(Zip.u32(d, p + 24))
                let n = Int(Zip.u16(d, p + 28)), x = Int(Zip.u16(d, p + 30)), c = Int(Zip.u16(d, p + 32))
                let off = Int(Zip.u32(d, p + 42))
                guard p + 46 + n <= d.count else { return nil }
                let name = String(decoding: d.subdata(in: (p + 46)..<(p + 46 + n)), as: UTF8.self)
                if !name.hasSuffix("/") { list.append(Entry(name: name, method: method, compressed: csize, size: size, offset: off)) }
                p += 46 + n + x + c
            }
            entries = list
        }

        func data(_ e: Entry, max: Int) -> Data? {
            guard e.size <= max, e.offset + 30 <= d.count, Zip.u32(d, e.offset) == 0x0403_4B50 else { return nil }
            let start = e.offset + 30 + Int(Zip.u16(d, e.offset + 26)) + Int(Zip.u16(d, e.offset + 28))
            guard start + e.compressed <= d.count else { return nil }
            let raw = d.subdata(in: start..<(start + e.compressed))
            if e.method == 0 { return raw }
            guard e.method == 8 else { return nil }
            if e.size == 0 { return Data() }
            // deflate: Apple's "zlib" is the raw deflate that zip files use
            var out = Data(count: e.size)
            let n = out.withUnsafeMutableBytes { (o: UnsafeMutableRawBufferPointer) -> Int in
                raw.withUnsafeBytes { (i: UnsafeRawBufferPointer) -> Int in
                    compression_decode_buffer(o.bindMemory(to: UInt8.self).baseAddress!, e.size,
                                              i.bindMemory(to: UInt8.self).baseAddress!, raw.count, nil, COMPRESSION_ZLIB)
                }
            }
            return n == e.size ? out : nil
        }
    }

    final class Writer {
        private var out = Data()
        private var central = Data()
        private var count = 0

        func add(_ name: String, _ data: Data) {
            let n = Data(name.utf8)
            let crc = Zip.crc32(data)
            let offset = out.count
            var h = Data()
            Zip.put32(&h, 0x0403_4B50); Zip.put16(&h, 20); Zip.put16(&h, 0x0800); Zip.put16(&h, 0)
            Zip.put16(&h, 0); Zip.put16(&h, 0x21)  // time and date (1980-01-01)
            Zip.put32(&h, crc); Zip.put32(&h, UInt32(data.count)); Zip.put32(&h, UInt32(data.count))
            Zip.put16(&h, UInt16(n.count)); Zip.put16(&h, 0)
            out.append(h); out.append(n); out.append(data)
            var c = Data()
            Zip.put32(&c, 0x0201_4B50); Zip.put16(&c, 20); Zip.put16(&c, 20); Zip.put16(&c, 0x0800); Zip.put16(&c, 0)
            Zip.put16(&c, 0); Zip.put16(&c, 0x21)
            Zip.put32(&c, crc); Zip.put32(&c, UInt32(data.count)); Zip.put32(&c, UInt32(data.count))
            Zip.put16(&c, UInt16(n.count)); Zip.put16(&c, 0); Zip.put16(&c, 0); Zip.put16(&c, 0); Zip.put16(&c, 0)
            Zip.put32(&c, 0); Zip.put32(&c, UInt32(offset))
            central.append(c); central.append(n)
            count += 1
        }

        func finish() -> Data {
            var d = out
            let start = d.count
            d.append(central)
            var e = Data()
            Zip.put32(&e, 0x0605_4B50); Zip.put16(&e, 0); Zip.put16(&e, 0)
            Zip.put16(&e, UInt16(count)); Zip.put16(&e, UInt16(count))
            Zip.put32(&e, UInt32(central.count)); Zip.put32(&e, UInt32(start)); Zip.put16(&e, 0)
            d.append(e)
            return d
        }
    }

    static func u16(_ d: Data, _ i: Int) -> UInt16 {
        guard i + 2 <= d.count else { return 0 }
        return UInt16(d[d.startIndex + i]) | UInt16(d[d.startIndex + i + 1]) << 8
    }

    static func u32(_ d: Data, _ i: Int) -> UInt32 {
        guard i + 4 <= d.count else { return 0 }
        return UInt32(u16(d, i)) | UInt32(u16(d, i + 2)) << 16
    }

    static func put16(_ d: inout Data, _ v: UInt16) { d.append(UInt8(v & 0xFF)); d.append(UInt8(v >> 8)) }
    static func put32(_ d: inout Data, _ v: UInt32) { put16(&d, UInt16(v & 0xFFFF)); put16(&d, UInt16(v >> 16)) }

    private static let table: [UInt32] = (0..<256).map { n -> UInt32 in
        var c = UInt32(n)
        for _ in 0..<8 { c = (c & 1) != 0 ? 0xEDB8_8320 ^ (c >> 1) : c >> 1 }
        return c
    }

    static func crc32(_ d: Data) -> UInt32 {
        var c: UInt32 = 0xFFFF_FFFF
        for b in d { c = table[Int((c ^ UInt32(b)) & 0xFF)] ^ (c >> 8) }
        return c ^ 0xFFFF_FFFF
    }
}
