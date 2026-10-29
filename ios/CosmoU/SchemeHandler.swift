// Serves the CosmoU page to the WKWebView:
//   cosmou-app://app/assets/www/…   files that come with the app (index.html, css, js, music)
//   cosmou-app://app/files/…        CosmoU's own files (covers, own music and themes)
// With byte ranges, which iOS needs to play music.
import Foundation
import WebKit

final class SchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "cosmou-app"
    var root: URL!
    private var stopped = Set<ObjectIdentifier>()
    private let queue = DispatchQueue(label: "cosmou.files", qos: .userInitiated)

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        let key = ObjectIdentifier(task)
        stopped.remove(key)
        guard let url = task.request.url, let file = resolve(url) else { return fail(task, 404) }
        let range = task.request.value(forHTTPHeaderField: "Range")
        queue.async { [weak self] in
            let data = try? Data(contentsOf: file, options: .mappedIfSafe)
            DispatchQueue.main.async {
                guard let self = self, !self.stopped.contains(key) else { return }
                guard let data = data else { return self.fail(task, 404) }
                self.respond(task, url, file, data, range)
            }
        }
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {
        stopped.insert(ObjectIdentifier(task))
    }

    private func resolve(_ url: URL) -> URL? {
        let path = url.path
        func inside(_ base: URL, _ rel: String) -> URL? {
            let parts = rel.split(separator: "/").map(String.init)
            if parts.isEmpty || parts.contains(where: { $0 == ".." || $0 == "." }) { return nil }
            var u = base
            for p in parts { u.appendPathComponent(p) }
            return u
        }
        if path.hasPrefix("/assets/"), let res = Bundle.main.resourceURL {
            return inside(res, String(path.dropFirst("/assets/".count)))
        }
        if path.hasPrefix("/files/") {
            return inside(root.appendingPathComponent("public", isDirectory: true), String(path.dropFirst("/files/".count)))
        }
        return nil
    }

    private func respond(_ task: WKURLSchemeTask, _ url: URL, _ file: URL, _ data: Data, _ range: String?) {
        var headers = [
            "Content-Type": SchemeHandler.mime(file.pathExtension),
            "Accept-Ranges": "bytes",
            "Access-Control-Allow-Origin": "*",
            "Cache-Control": "no-cache",
        ]
        var body = data
        var status = 200
        let total = data.count
        if let r = range, let rg = SchemeHandler.parseRange(r, total) {
            let (a, b) = rg
            if a >= total || a > b {
                headers["Content-Range"] = "bytes */\(total)"
                return fail(task, 416, headers)
            }
            body = data.subdata(in: a..<(b + 1))
            status = 206
            headers["Content-Range"] = "bytes \(a)-\(b)/\(total)"
        }
        headers["Content-Length"] = String(body.count)
        guard let resp = HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1", headerFields: headers) else {
            return fail(task, 500)
        }
        task.didReceive(resp)
        task.didReceive(body)
        task.didFinish()
    }

    // "bytes=10-", "bytes=10-99" or "bytes=-500"
    static func parseRange(_ h: String, _ total: Int) -> (Int, Int)? {
        guard h.hasPrefix("bytes=") else { return nil }
        let spec = h.dropFirst(6).split(separator: ",").first.map(String.init) ?? ""
        let p = spec.split(separator: "-", omittingEmptySubsequences: false).map { $0.trimmingCharacters(in: .whitespaces) }
        guard p.count == 2 else { return nil }
        if p[0].isEmpty {
            guard let n = Int(p[1]), n > 0 else { return nil }
            return (max(0, total - n), total - 1)
        }
        guard let a = Int(p[0]) else { return nil }
        let b = p[1].isEmpty ? total - 1 : min(Int(p[1]) ?? (total - 1), total - 1)
        return (a, b)
    }

    private func fail(_ task: WKURLSchemeTask, _ status: Int, _ headers: [String: String] = [:]) {
        guard let url = task.request.url,
              let r = HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1",
                                      headerFields: headers.merging(["Content-Length": "0"]) { a, _ in a }) else {
            task.didFailWithError(URLError(.fileDoesNotExist))
            return
        }
        task.didReceive(r)
        task.didReceive(Data())
        task.didFinish()
    }

    static func mime(_ ext: String) -> String {
        switch ext.lowercased() {
        case "html", "htm": return "text/html; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json", "cosmoutheme": return ext.lowercased() == "json" ? "application/json" : "application/zip"
        case "txt": return "text/plain; charset=utf-8"
        case "svg": return "image/svg+xml"
        case "png": return "image/png"
        case "jpg", "jpeg": return "image/jpeg"
        case "webp": return "image/webp"
        case "gif": return "image/gif"
        case "ico": return "image/x-icon"
        case "ogg": return "audio/ogg"
        case "m4a", "aac": return "audio/mp4"
        case "mp3": return "audio/mpeg"
        case "wav": return "audio/wav"
        case "flac": return "audio/flac"
        case "woff2": return "font/woff2"
        case "woff": return "font/woff"
        case "ttf": return "font/ttf"
        default: return "application/octet-stream"
        }
    }
}
