// The bridge between the CosmoU page and iOS. It does only what needs the phone: files, internet, MeloCafe,
// other apps and file pickers. Everything else (library, play time, themes …) happens in js/mobile-api.js,
// the same code as on Android.
//
// MeloCafe (Cemu for iOS, github.com/stossy11/MeloCafe) has two links for apps like CosmoU:
//   melocafe://gameInfo?scheme=cosmou   MeloCafe opens and sends back cosmou://melocafe?games=<base64url JSON>
//                                       (title id, title and icon of every game it has)
//   melocafe://game?id=<title id>       starts that game
// MeloNX (the Switch emulator for iOS, by the same developer) answers the same two links as melonx://…;
// its list has titleName, titleId (hex) and iconData instead.
// For full speed MeloCafe needs JIT, which StikDebug gives it: stikjit://enable-jit?bundle-id=<MeloCafe's bundle id>
// starts MeloCafe with JIT; games CosmoU starts after that run in that MeloCafe.
import UIKit
import UniformTypeIdentifiers

final class Bridge {
    static let syncTag = "\u{1}cosmou-sync"
    weak var host: MainViewController?
    let root: URL

    init() {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        root = base.appendingPathComponent("CosmoU", isDirectory: true)
        try? FileManager.default.createDirectory(at: root.appendingPathComponent("public", isDirectory: true),
                                                 withIntermediateDirectories: true)
    }

    // the page's window.CosmoNative
    static func pageScript(test: Bool) -> String {
        var s = """
        (function () {
          var tag = '\\u0001cosmou-sync';
          window.CosmoNative = {
            sync: function (name, args) { return prompt(tag, JSON.stringify([name, args])); },
            call: function (id, name, args) { window.webkit.messageHandlers.cosmou.postMessage([id, name, args]); }
          };
        })();
        """
        if test {
            s += """

            window.__errs = [];
            addEventListener('error', function (e) { __errs.push(String(e.message) + ' @' + (e.filename || '').split('/').pop() + ':' + e.lineno); });
            addEventListener('unhandledrejection', function (e) { __errs.push('promise: ' + String(e.reason && (e.reason.stack || e.reason))); });
            """
        }
        return s
    }

    // a path inside CosmoU's own folder ("public/…" is what the page can load as /files/…)
    func file(_ rel: String) -> URL? {
        if rel.hasPrefix("/") || rel.contains("\\") { return nil }
        let parts = rel.split(separator: "/").map(String.init)
        if parts.isEmpty || parts.contains(where: { $0 == ".." || $0 == "." || $0.isEmpty }) { return nil }
        var u = root
        for p in parts { u.appendPathComponent(p) }
        return u
    }

    static func json(_ v: Any?) -> String {
        guard let v = v, !(v is NSNull) else { return "null" }
        if let d = try? JSONSerialization.data(withJSONObject: v, options: [.fragmentsAllowed]),
           let s = String(data: d, encoding: .utf8) {
            return s
        }
        return "null"
    }

    func ok(_ extra: [String: Any] = [:]) -> [String: Any] { extra.merging(["ok": true]) { a, _ in a } }
    func err(_ m: String) -> [String: Any] { ["ok": false, "error": m] }
    let cancel: [String: Any] = ["ok": false, "cancel": true]

    // ---------- sync calls ----------
    func sync(_ payload: String) -> String {
        guard let p = (try? JSONSerialization.jsonObject(with: Data(payload.utf8))) as? [Any], p.count == 2,
              let name = p[0] as? String, let argsJson = p[1] as? String,
              let a = (try? JSONSerialization.jsonObject(with: Data(argsJson.utf8))) as? [Any] else { return "null" }
        return Bridge.json(syncDo(name, a))
    }

    private func str(_ a: [Any], _ i: Int) -> String { i < a.count ? (a[i] as? String ?? "") : "" }

    private func syncDo(_ name: String, _ a: [Any]) -> Any? {
        let fm = FileManager.default
        switch name {
        case "info":
            let d = UIDevice.current
            var o: [String: Any] = [
                "os": "ios",
                "version": Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "",
                "build": Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "",
                "system": d.userInterfaceIdiom == .pad ? "iPadOS" : "iOS",
                "release": d.systemVersion,
                "device": d.userInterfaceIdiom == .pad ? "iPad" : "iPhone",
                "idiom": d.userInterfaceIdiom == .pad ? "pad" : "phone",
                "model": Bridge.model,
            ]
            o["fps"] = UIScreen.main.maximumFramesPerSecond
            o["fast"] = host?.fastDisplay ?? false
            if Test.on { o["test"] = true }
            if Test.quiet { o["quiet"] = true }
            return o
        case "read":
            guard let f = file(str(a, 0)), let size = (try? fm.attributesOfItem(atPath: f.path))?[.size] as? Int,
                  size <= 8 * 1048576 else { return nil }
            return try? String(contentsOf: f, encoding: .utf8)
        case "write":
            guard let f = file(str(a, 0)) else { return false }
            try? fm.createDirectory(at: f.deletingLastPathComponent(), withIntermediateDirectories: true)
            return (try? Data(str(a, 1).utf8).write(to: f, options: .atomic)) != nil
        case "list":
            guard let f = file(str(a, 0)), let n = try? fm.contentsOfDirectory(atPath: f.path) else { return [String]() }
            return n.filter { !$0.hasPrefix(".") && !$0.hasSuffix(".tmp") }.sorted()
        case "remove":
            guard let f = file(str(a, 0)) else { return false }
            try? fm.removeItem(at: f)
            return !fm.fileExists(atPath: f.path)
        case "move":
            guard let from = file(str(a, 0)), let to = file(str(a, 1)), fm.fileExists(atPath: from.path) else { return false }
            try? fm.createDirectory(at: to.deletingLastPathComponent(), withIntermediateDirectories: true)
            try? fm.removeItem(at: to)
            return (try? fm.moveItem(at: from, to: to)) != nil
        case "assets":
            // files that come with the app ("www/…")
            guard let res = Bundle.main.resourceURL, !str(a, 0).contains("..") else { return [String]() }
            return ((try? fm.contentsOfDirectory(atPath: res.appendingPathComponent(str(a, 0)).path)) ?? []).sorted()
        case "cemuInfo":
            let installed = UIApplication.shared.canOpenURL(URL(string: "melocafe://")!)
            return ["installed": installed, "pkg": installed ? "MeloCafe" : "", "version": "",
                    "stikdebug": UIApplication.shared.canOpenURL(URL(string: "stikjit://")!)] as [String: Any]
        case "startJit":
            // MeloCafe's bundle id is different for everyone (SideStore and AltStore change it), MeloCafe tells it
            let b = str(a, 0)
            guard b.range(of: "^[A-Za-z0-9.-]+$", options: .regularExpression) != nil,
                  let u = URL(string: "stikjit://enable-jit?bundle-id=" + b), UIApplication.shared.canOpenURL(u) else { return false }
            open(u)
            return true
        case "night":
            return host?.traitCollection.userInterfaceStyle == .dark
        case "appInstalled":
            guard let u = URL(string: str(a, 0)) else { return false }
            return UIApplication.shared.canOpenURL(u)
        case "appIcon":
            return false
        case "openUrl":
            guard let u = URL(string: str(a, 0)), ["https", "http", "mailto"].contains(u.scheme ?? "") else { return false }
            open(u)
            return true
        case "openCemu":
            let u = URL(string: "melocafe://")!
            guard UIApplication.shared.canOpenURL(u) else { return false }
            open(u)
            return true
        case "immersive":
            return true
        case "viewSize":
            guard let w = host?.web else { return nil }
            return [w.bounds.width, w.bounds.height]
        case "bg":
            host?.setStripColor(str(a, 0))
            return true
        case "openLog":
            return Test.on ? openLog : nil
        case "testPad":
            guard Test.on, a.count >= 2, let b = (a[0] as? NSNumber)?.intValue else { return false }
            Pads.shared.press(b, (a[1] as? Bool) ?? false)
            return true
        default:
            return nil
        }
    }

    static var model: String {
        if let sim = ProcessInfo.processInfo.environment["SIMULATOR_MODEL_IDENTIFIER"] { return sim + " (Simulator)" }
        var u = utsname()
        uname(&u)
        return withUnsafeBytes(of: &u.machine) { b in
            String(cString: b.bindMemory(to: CChar.self).baseAddress!)
        }
    }

    // other apps are opened here (the last ones are kept for the automatic test)
    private(set) var openLog: [String] = []
    // (right after an app was installed iOS sometimes refuses its link once, so a refused link is tried again)
    func open(_ u: URL, again: Bool = true, _ done: ((Bool) -> Void)? = nil) {
        let t0 = Date()
        UIApplication.shared.open(u, options: [:]) { [weak self] ok in
            let line = String(format: "%.1fs ", Date().timeIntervalSince(t0)) + String(u.absoluteString.prefix(70)) + (ok ? " → opened" : " → refused")
            self?.openLog = Array(((self?.openLog ?? []) + [line]).suffix(20))
            NSLog("CosmoU open: %@", line)
            if !ok, again, UIApplication.shared.canOpenURL(u) {
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { self?.open(u, again: false, done) }
                return
            }
            done?(ok)
        }
    }

    // ---------- async calls (answered with done(id, result)) ----------
    func call(id: Int, name: String, argsJson: String) {
        let a = ((try? JSONSerialization.jsonObject(with: Data(argsJson.utf8))) as? [Any]) ?? []
        let done: (Any?) -> Void = { [weak self] r in
            DispatchQueue.main.async { self?.host?.done(id, r) }
        }
        switch name {
        case "pickFolder": getGames(str(a, 0) == "melonx" ? "melonx" : "melocafe", done)
        case "fetchFile": fetchFile(str(a, 0), str(a, 1), str(a, 2), done)
        case "fetchText": fetchText(str(a, 0), done)
        case "launchCemu": launchGame(str(a, 0), done)
        case "launchApp": launchApp(str(a, 0), done)
        case "pickApp": pickApp(done)
        case "pickFile": pickFile(str(a, 0), str(a, 1), done)
        case "saveFile": saveFile(str(a, 0), Data(str(a, 2).utf8), done)
        case "themePick": themePick(done)
        case "themeInstall": done(themeInstall(str(a, 0), str(a, 1), str(a, 2)))
        case "themeExport": themeExport(str(a, 0), str(a, 1), done)
        case "scanTree": done(err("Not on iPhone and iPad."))
        default: done(err("Unknown request: " + name))
        }
    }

    // ---------- the games from MeloCafe ----------
    private var gamesWaiting: [(Any?) -> Void] = []
    private var gamesAway = false
    private var gamesRound = 0

    private func getGames(_ scheme: String, _ done: @escaping (Any?) -> Void) {
        let app = scheme == "melonx" ? "MeloNX" : "MeloCafe"
        let u = URL(string: scheme + "://gameInfo?scheme=cosmou")!
        guard UIApplication.shared.canOpenURL(u) else {
            return done(err(app + " isn’t installed yet. Get it first (Settings → Cemu & Games)."))
        }
        gamesWaiting.append(done)
        if gamesWaiting.count > 1 { return }
        gamesAway = false
        gamesRound += 1
        let round = gamesRound
        open(u) { [weak self] opened in
            if !opened { self?.finishGames(self?.err(app + " couldn’t be opened.")) }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 180) { [weak self] in
            guard let self = self, self.gamesRound == round, !self.gamesWaiting.isEmpty else { return }
            self.finishGames(self.err(app + " didn’t answer. Open " + app + " once, then try again."))
        }
    }

    func resignedActive() {
        if !gamesWaiting.isEmpty { gamesAway = true }
    }

    func becameActive() {
        guard !gamesWaiting.isEmpty, gamesAway else { return }
        // the list comes together with coming back; without it, this MeloCafe can't send it
        let round = gamesRound
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [weak self] in
            guard let self = self, self.gamesRound == round, !self.gamesWaiting.isEmpty,
                  UIApplication.shared.applicationState == .active else { return }
            self.finishGames(self.err("The emulator didn’t send its games. Update it and try again."))
        }
    }

    private func finishGames(_ r: Any?) {
        let w = gamesWaiting
        gamesWaiting = []
        gamesRound += 1
        for f in w { f(r) }
    }

    func gamesArrived(_ url: URL) {
        let q = URLComponents(url: url, resolvingAgainstBaseURL: false)?.queryItems?.first { $0.name == "games" }?.value ?? ""
        var b = q.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
        while b.count % 4 != 0 { b += "=" }
        let from = url.host == "melonx" ? "melonx" : "melocafe"
        guard let data = Data(base64Encoded: b),
              let list = (try? JSONSerialization.jsonObject(with: data)) as? [[String: Any]] else {
            return finishGames(err("The emulator sent something CosmoU can’t read."))
        }
        let fm = FileManager.default
        let icons = root.appendingPathComponent("public/covers-auto", isDirectory: true)
        try? fm.createDirectory(at: icons, withIntermediateDirectories: true)
        var out: [[String: Any]] = []
        var bundle = ""
        for g in list {
            if let b = g["bundleId"] as? String, !b.isEmpty { bundle = b }
            // MeloCafe: id (a number) and title · MeloNX: titleId (hex) and titleName
            var tid = "", launch = ""
            if from == "melonx" {
                guard let t = g["titleId"] as? String, let v = UInt64(t, radix: 16), v != 0 else { continue }
                tid = String(format: "%016llx", v)
                launch = t
            } else {
                guard let idNum = g["id"] as? NSNumber, idNum.uint64Value != 0 else { continue }
                tid = String(format: "%016llx", idNum.uint64Value)
                launch = String(idNum.uint64Value)
            }
            var e: [String: Any] = ["id": launch, "tid": tid, "title": (g["title"] as? String) ?? (g["titleName"] as? String) ?? ""]
            if let s = (g["icon"] as? String) ?? (g["iconData"] as? String), let d = Data(base64Encoded: s), let img = UIImage(data: d) {
                if let png = img.pngData() { try? png.write(to: icons.appendingPathComponent(tid + "-icon.png"), options: .atomic) }
                if let c = Bridge.averageColor(img) { e["color"] = c }
            }
            out.append(e)
        }
        if let d = try? JSONSerialization.data(withJSONObject: out, options: [.prettyPrinted]) {
            try? d.write(to: root.appendingPathComponent(from + "-games.json"), options: .atomic)
        }
        if gamesWaiting.isEmpty { host?.event("covers-updated") }
        finishGames(ok(["count": out.count, "bundle": bundle]))
    }

    static func averageColor(_ img: UIImage) -> String? {
        guard let cg = img.cgImage else { return nil }
        var px = [UInt8](repeating: 0, count: 4)
        let ok: Bool = px.withUnsafeMutableBytes { buf in
            guard let ctx = CGContext(data: buf.baseAddress, width: 1, height: 1, bitsPerComponent: 8, bytesPerRow: 4,
                                      space: CGColorSpaceCreateDeviceRGB(),
                                      bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return false }
            ctx.interpolationQuality = .medium
            ctx.draw(cg, in: CGRect(x: 0, y: 0, width: 1, height: 1))
            return true
        }
        return ok ? "rgb(\(px[0]), \(px[1]), \(px[2]))" : nil
    }

    // ---------- starting games and apps ----------
    private func launchGame(_ path: String, _ done: @escaping (Any?) -> Void) {
        // melocafe:<title id as a number> (Wii U) or melonx:<title id in hex> (Switch)
        let parts = path.split(separator: ":", maxSplits: 1).map(String.init)
        guard parts.count == 2, ["melocafe", "melonx"].contains(parts[0]), !parts[1].isEmpty,
              parts[1].allSatisfy({ $0.isHexDigit }),
              let u = URL(string: parts[0] + "://game?id=" + parts[1]) else {
            return done(err("CosmoU doesn’t know where this game is. Get your games again."))
        }
        let app = parts[0] == "melonx" ? "MeloNX" : "MeloCafe"
        guard UIApplication.shared.canOpenURL(u) else {
            return done(err(app + " isn’t installed yet. Open Settings → Cemu & Games to get it."))
        }
        open(u) { [weak self] opened in
            done(opened ? self?.ok() : self?.err(app + " couldn’t be started."))
        }
    }

    private func launchApp(_ link: String, _ done: @escaping (Any?) -> Void) {
        guard let u = URL(string: link), u.scheme != nil else { return done(err("This app link isn’t valid.")) }
        open(u) { [weak self] opened in
            done(opened ? self?.ok() : self?.err("The app couldn’t be started. Is it still installed?"))
        }
    }

    // apps people like to have next to their Wii U games (iOS only says if an app is there for links it knows)
    static let knownApps: [(String, String)] = [
        ("MeloNX", "melonx://"), ("Delta", "delta://"), ("RetroArch", "retroarch://"), ("PPSSPP", "ppsspp://"),
        ("Provenance", "provenance://"), ("DolphiniOS", "dolphinios://"), ("Pomelo", "pomelo://"),
        ("Manic EMU", "manic-emu://"), ("Flycast", "flycast://"), ("Steam Link", "steamlink://"), ("Moonlight", "moonlight://"),
    ]

    private func pickApp(_ done: @escaping (Any?) -> Void) {
        let installed = Bridge.knownApps.filter { UIApplication.shared.canOpenURL(URL(string: $0.1)!) }
        if Test.on, let want = Test.answer("pick-app") {
            if let a = installed.first(where: { $0.0 == want }) { return done(["pkg": a.1, "name": a.0]) }
            return done(cancel)
        }
        let s = UIAlertController(title: "Add an app to CosmoU", message: installed.isEmpty ? nil : "Apps on this device",
                                  preferredStyle: .actionSheet)
        for a in installed {
            s.addAction(UIAlertAction(title: a.0, style: .default) { _ in done(["pkg": a.1, "name": a.0]) })
        }
        s.addAction(UIAlertAction(title: "Other app (with its link)…", style: .default) { [weak self] _ in self?.askLink(done) })
        s.addAction(UIAlertAction(title: "Cancel", style: .cancel) { [weak self] _ in done(self?.cancel) })
        host?.presentTop(s)
    }

    private func askLink(_ done: @escaping (Any?) -> Void) {
        let a = UIAlertController(title: "Other app",
                                  message: "The link that opens the app, for example melonx:// or retroarch://", preferredStyle: .alert)
        a.addTextField { $0.placeholder = "Name"; $0.autocapitalizationType = .words }
        a.addTextField {
            $0.placeholder = "app://"
            $0.keyboardType = .URL
            $0.autocapitalizationType = .none
            $0.autocorrectionType = .no
        }
        a.addAction(UIAlertAction(title: "Cancel", style: .cancel) { [weak self] _ in done(self?.cancel) })
        a.addAction(UIAlertAction(title: "Add", style: .default) { [weak self] _ in
            var link = (a.textFields?[1].text ?? "").trimmingCharacters(in: .whitespaces)
            if !link.isEmpty, !link.contains(":") { link += "://" }
            let name = (a.textFields?[0].text ?? "").trimmingCharacters(in: .whitespaces)
            guard let u = URL(string: link), let sc = u.scheme, sc.range(of: "^[a-zA-Z][a-zA-Z0-9+.-]*$", options: .regularExpression) != nil
            else { return done(self?.err("That isn’t an app link.")) }
            done(["pkg": link, "name": name.isEmpty ? sc : name])
        })
        host?.presentTop(a)
    }

    // ---------- internet ----------
    private static let session: URLSession = {
        let c = URLSessionConfiguration.default
        c.timeoutIntervalForRequest = 20
        c.httpAdditionalHeaders = ["User-Agent": "CosmoU-iOS", "Accept": "application/vnd.github+json, image/*, */*"]
        return URLSession(configuration: c)
    }()

    private static func offline(_ e: Error?) -> Bool {
        guard let e = e as? URLError else { return false }
        return [.notConnectedToInternet, .cannotFindHost, .dnsLookupFailed, .networkConnectionLost, .cannotConnectToHost,
                .dataNotAllowed, .internationalRoamingOff].contains(e.code)
    }

    private func fetchFile(_ url: String, _ rel: String, _ typePrefix: String, _ done: @escaping (Any?) -> Void) {
        guard let f = file(rel), url.hasPrefix("https://"), let u = URL(string: url) else { return done(err("Not allowed.")) }
        Bridge.session.dataTask(with: u) { data, resp, e in
            if Bridge.offline(e) { return done(["ok": false, "offline": true, "error": "No internet connection."]) }
            let h = resp as? HTTPURLResponse
            let st = h?.statusCode ?? 0
            let type = h?.mimeType ?? ""
            guard st == 200, let d = data, type.hasPrefix(typePrefix), d.count <= 50 * 1048576 else {
                return done(["ok": false, "status": st])
            }
            try? FileManager.default.createDirectory(at: f.deletingLastPathComponent(), withIntermediateDirectories: true)
            done(["ok": (try? d.write(to: f, options: .atomic)) != nil, "status": st])
        }.resume()
    }

    private func fetchText(_ url: String, _ done: @escaping (Any?) -> Void) {
        guard url.hasPrefix("https://"), let u = URL(string: url) else { return done(err("Not allowed.")) }
        Bridge.session.dataTask(with: u) { data, resp, e in
            if Bridge.offline(e) { return done(["ok": false, "error": "No internet connection."]) }
            let st = (resp as? HTTPURLResponse)?.statusCode ?? 0
            var o: [String: Any] = ["ok": st == 200, "status": st]
            if st == 200, let d = data, d.count <= 4 * 1048576 { o["text"] = String(decoding: d, as: UTF8.self) }
            done(o)
        }.resume()
    }

    // ---------- files from and to the device ----------
    private static let audioExt = ["mp3", "ogg", "wav", "m4a", "flac", "aac"]
    private static let imageExt = ["png", "jpg", "jpeg", "webp"]

    private func pickFile(_ kind: String, _ destRel: String, _ done: @escaping (Any?) -> Void) {
        let types: [UTType] = kind == "audio" ? [.audio] : kind == "image" ? [.image] : [.json, .plainText, .data]
        Picker.open(host, types: types, test: "pick-file") { [weak self] url in
            guard let self = self else { return }
            guard let url = url else { return done(self.cancel) }
            var name = url.lastPathComponent
            if kind == "json" {
                guard let t = try? String(contentsOf: url, encoding: .utf8) else { return done(self.err("Could not read that file.")) }
                return done(["text": t, "name": name])
            }
            let ext = url.pathExtension.lowercased()
            let okExt = kind == "audio" ? Bridge.audioExt : Bridge.imageExt
            if !okExt.contains(ext) { name = (url.deletingPathExtension().lastPathComponent) + (kind == "audio" ? ".m4a" : ".png") }
            name = name.replacingOccurrences(of: "[^\\w .()\\-]", with: "_", options: .regularExpression)
            guard let dir = self.file(destRel) else { return done(self.err("Not allowed.")) }
            let fm = FileManager.default
            try? fm.createDirectory(at: dir, withIntermediateDirectories: true)
            if kind == "audio" {
                // only one own music file at a time
                for n in (try? fm.contentsOfDirectory(atPath: dir.path)) ?? [] where Bridge.audioExt.contains((n as NSString).pathExtension.lowercased()) {
                    try? fm.removeItem(at: dir.appendingPathComponent(n))
                }
            } else {
                name = "pick-\(Int(Date().timeIntervalSince1970 * 1000))." + (name as NSString).pathExtension
            }
            let to = dir.appendingPathComponent(name)
            try? fm.removeItem(at: to)
            guard (try? fm.copyItem(at: url, to: to)) != nil else { return done(self.err("Could not copy that file.")) }
            done(["rel": destRel + "/" + name, "name": name])
        }
    }

    private func saveFile(_ name: String, _ data: Data, _ done: @escaping (Any?) -> Void) {
        let safe = name.replacingOccurrences(of: "[/\\\\:]", with: "_", options: .regularExpression)
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("export-\(UUID().uuidString)", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        let f = dir.appendingPathComponent(safe.isEmpty ? "cosmou-file" : safe)
        guard (try? data.write(to: f)) != nil else { return done(err("Could not save the file.")) }
        Picker.export(host, f, test: "export") { [weak self] saved in
            try? FileManager.default.removeItem(at: dir)
            done(saved ? self?.ok() : self?.cancel)
        }
    }

    // ---------- own themes (.cosmoutheme = a zip with theme.json and maybe music) ----------
    private func themePick(_ done: @escaping (Any?) -> Void) {
        Picker.open(host, types: [.data, .json, .zip], test: "pick-theme") { [weak self] url in
            guard let self = self else { return }
            guard let url = url else { return done(self.cancel) }
            if url.pathExtension.lowercased() == "json" {
                guard let t = try? String(contentsOf: url, encoding: .utf8), t.utf8.count <= 64 * 1024 else {
                    return done(self.err("Could not read that file."))
                }
                return done(["json": t])
            }
            guard let z = Zip.Reader(url) else { return done(self.err("Could not read that file.")) }
            guard let je = z.entries.first(where: { ($0.name as NSString).lastPathComponent.lowercased() == "theme.json" }),
                  let jd = z.data(je, max: 64 * 1024) else { return done(self.err("No theme.json found in that file.")) }
            let json = String(decoding: jd, as: UTF8.self)
            var o: [String: Any] = ["json": json]
            let audio = z.entries.filter { Bridge.audioExt.contains(($0.name as NSString).pathExtension.lowercased()) }
            var want = ""
            if let j = (try? JSONSerialization.jsonObject(with: jd)) as? [String: Any], let m = j["music"] as? String {
                want = (m as NSString).lastPathComponent.lowercased()
            }
            if let pick = audio.first(where: { ($0.name as NSString).lastPathComponent.lowercased() == want }) ?? audio.first {
                guard let md = z.data(pick, max: 40 * 1048576) else {
                    return done(self.err("The music file in that theme is too big (40 MB at most)."))
                }
                let ext = "." + (pick.name as NSString).pathExtension.lowercased()
                let tmp = FileManager.default.temporaryDirectory.appendingPathComponent("theme-music" + ext)
                try? md.write(to: tmp, options: .atomic)
                o["music"] = ["ext": ext, "tmp": tmp.lastPathComponent]
            }
            done(o)
        }
    }

    private func themeInstall(_ id: String, _ json: String, _ tmpName: String) -> Any {
        guard id.range(of: "^u-[a-z0-9-]+$", options: .regularExpression) != nil,
              let dir = file("public/own-themes/" + id) else { return err("Unknown theme.") }
        let fm = FileManager.default
        try? fm.removeItem(at: dir)
        try? fm.createDirectory(at: dir, withIntermediateDirectories: true)
        guard (try? Data(json.utf8).write(to: dir.appendingPathComponent("theme.json"), options: .atomic)) != nil else {
            return err("Could not save the theme.")
        }
        if tmpName.range(of: "^theme-music\\.[a-z0-9]+$", options: .regularExpression) != nil {
            let tmp = fm.temporaryDirectory.appendingPathComponent(tmpName)
            if fm.fileExists(atPath: tmp.path) {
                try? fm.moveItem(at: tmp, to: dir.appendingPathComponent("music." + tmp.pathExtension))
            }
        }
        return ok()
    }

    private func themeExport(_ id: String, _ name: String, _ done: @escaping (Any?) -> Void) {
        guard id.range(of: "^u-[a-z0-9-]+$", options: .regularExpression) != nil, let dir = file("public/own-themes/" + id),
              let names = try? FileManager.default.contentsOfDirectory(atPath: dir.path) else { return done(err("Unknown theme.")) }
        let w = Zip.Writer()
        for n in names.sorted() where n == "theme.json" || n.hasPrefix("music.") {
            if let d = try? Data(contentsOf: dir.appendingPathComponent(n)) { w.add(n, d) }
        }
        saveFile(name, w.finish(), done)
    }
}

// the file pickers of iOS ("Files"); in the automatic test the answer comes from a file instead
final class Picker: NSObject, UIDocumentPickerDelegate {
    private static var live: [Picker] = []
    private var done: (([URL]?) -> Void)?

    static func open(_ host: MainViewController?, types: [UTType], test: String, _ done: @escaping (URL?) -> Void) {
        if Test.on, let f = Test.answer(test) {
            return done(f.isEmpty ? nil : URL(fileURLWithPath: f))
        }
        let c = UIDocumentPickerViewController(forOpeningContentTypes: types, asCopy: true)
        c.allowsMultipleSelection = false
        show(host, c) { done($0?.first) }
    }

    static func export(_ host: MainViewController?, _ file: URL, test: String, _ done: @escaping (Bool) -> Void) {
        if Test.on, let dest = Test.answer(test) {
            let to = URL(fileURLWithPath: dest).appendingPathComponent(file.lastPathComponent)
            try? FileManager.default.removeItem(at: to)
            return done((try? FileManager.default.copyItem(at: file, to: to)) != nil)
        }
        let c = UIDocumentPickerViewController(forExporting: [file], asCopy: true)
        show(host, c) { done($0 != nil) }
    }

    private static func show(_ host: MainViewController?, _ c: UIDocumentPickerViewController, _ done: @escaping ([URL]?) -> Void) {
        guard let host = host else { return done(nil) }
        let p = Picker()
        p.done = done
        live.append(p)
        c.delegate = p
        host.presentTop(c)
    }

    func documentPicker(_ c: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) { finish(urls) }
    func documentPickerWasCancelled(_ c: UIDocumentPickerViewController) { finish(nil) }

    private func finish(_ urls: [URL]?) {
        let d = done
        done = nil
        Picker.live.removeAll { $0 === self }
        d?(urls)
    }
}
