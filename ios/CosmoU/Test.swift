// Only for the automatic test (scripts/ci/ios-test.js, started with -cosmouTest YES): the test puts JavaScript files
// into CosmoU's folder (test/in), the app runs them in the page and writes the answers to test/out.
// File pickers and the app list take their answers from test/answers/<name> instead of showing a window.
import Foundation
import WebKit

enum Test {
    static let on = UserDefaults.standard.bool(forKey: "cosmouTest")
    static let quiet = UserDefaults.standard.bool(forKey: "cosmouQuiet")
    private static var dir: URL?
    private static var timer: Timer?

    static func start(_ vc: MainViewController) {
        let d = vc.bridge.root.appendingPathComponent("test", isDirectory: true)
        dir = d
        let fm = FileManager.default
        for s in ["in", "out", "answers"] { try? fm.createDirectory(at: d.appendingPathComponent(s), withIntermediateDirectories: true) }
        try? Data("ready".utf8).write(to: d.appendingPathComponent("started"))
        NSLog("CosmoU: test mode")
        timer = Timer.scheduledTimer(withTimeInterval: 0.2, repeats: true) { [weak vc] _ in
            guard let vc = vc, let web = vc.web else { return }
            let inDir = d.appendingPathComponent("in")
            for n in ((try? fm.contentsOfDirectory(atPath: inDir.path)) ?? []).sorted() where n.hasSuffix(".js") {
                let f = inDir.appendingPathComponent(n)
                guard let code = try? String(contentsOf: f, encoding: .utf8) else { continue }
                try? fm.removeItem(at: f)
                let out = d.appendingPathComponent("out").appendingPathComponent((n as NSString).deletingPathExtension + ".json")
                web.callAsyncJavaScript(code, arguments: [:], in: nil, in: .page) { r in
                    var o: [String: Any] = [:]
                    switch r {
                    case .success(let v):
                        if let s = v as? String { o["value"] = s }
                    case .failure(let e):
                        let ns = e as NSError
                        o["error"] = (ns.userInfo["WKJavaScriptExceptionMessage"] as? String) ?? ns.localizedDescription
                    }
                    if let data = try? JSONSerialization.data(withJSONObject: o) { try? data.write(to: out, options: .atomic) }
                }
            }
        }
    }

    // the answer for a picker: the file's text (a path, an app name …), "" for "cancelled", nil = show the real picker
    static func answer(_ name: String) -> String? {
        guard let d = dir else { return nil }
        let f = d.appendingPathComponent("answers").appendingPathComponent(name)
        guard let t = try? String(contentsOf: f, encoding: .utf8) else { return nil }
        return t.trimmingCharacters(in: .whitespacesAndNewlines)
    }
}
