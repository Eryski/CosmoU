// The CosmoU window: a WKWebView with the CosmoU page from the app (cosmou-app://app/assets/www/index.html).
// The page talks to the app through window.CosmoNative (made in Bridge.pageScript):
//   sync calls go through prompt() (answered right away below), async calls through a message handler.
import UIKit
import WebKit

final class MainViewController: UIViewController, WKUIDelegate, WKNavigationDelegate, WKScriptMessageHandler {
    private(set) var web: WKWebView!
    let bridge = Bridge()
    private let files = SchemeHandler()
    private var pageReady = false
    private var leftEdge: NSLayoutConstraint!
    private var rightEdge: NSLayoutConstraint!
    // the strips next to the Dynamic Island and the round corners continue the page's colors
    private let leftStrip = UIImageView()
    private let rightStrip = UIImageView()
    private var stripTimer: Timer?
    // ProMotion (120 Hz) for the page, when this iOS lets WebKit go past 60 frames per second
    private(set) var fastDisplay = false

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .landscape }
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { [.bottom, .top] }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(named: "LaunchBG") ?? .black
        files.root = bridge.root
        bridge.host = self

        let cfg = WKWebViewConfiguration()
        cfg.setURLSchemeHandler(files, forURLScheme: SchemeHandler.scheme)
        cfg.allowsInlineMediaPlayback = true
        cfg.mediaTypesRequiringUserActionForPlayback = []
        cfg.preferences.javaScriptCanOpenWindowsAutomatically = false
        fastDisplay = MainViewController.allow120Hz(cfg.preferences)
        let uc = cfg.userContentController
        uc.add(WeakHandler(self), name: "cosmou")
        uc.addUserScript(WKUserScript(source: Bridge.pageScript(test: Test.on), injectionTime: .atDocumentStart,
                                      forMainFrameOnly: true))

        let w = WKWebView(frame: view.bounds, configuration: cfg)
        w.uiDelegate = self
        w.navigationDelegate = self
        w.isOpaque = false
        w.backgroundColor = .clear
        w.scrollView.backgroundColor = .clear
        w.scrollView.bounces = false
        w.scrollView.alwaysBounceVertical = false
        w.scrollView.contentInsetAdjustmentBehavior = .never
        w.scrollView.isScrollEnabled = false
        w.scrollView.pinchGestureRecognizer?.isEnabled = false
        w.allowsLinkPreview = false
        w.allowsBackForwardNavigationGestures = false
        if #available(iOS 16.4, *) { w.isInspectable = Test.on }
        w.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(w)
        for s in [leftStrip, rightStrip] {
            s.translatesAutoresizingMaskIntoConstraints = false
            s.contentMode = .scaleToFill
            s.layer.magnificationFilter = .linear
            view.insertSubview(s, belowSubview: w)
        }
        // next to the Dynamic Island, not under it (see updateEdges); top and bottom go to the edge (the home bar hides by itself)
        leftEdge = w.leadingAnchor.constraint(equalTo: view.leadingAnchor)
        rightEdge = view.trailingAnchor.constraint(equalTo: w.trailingAnchor)
        NSLayoutConstraint.activate([
            leftEdge, rightEdge,
            w.topAnchor.constraint(equalTo: view.topAnchor),
            w.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            leftStrip.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            leftStrip.trailingAnchor.constraint(equalTo: w.leadingAnchor),
            leftStrip.topAnchor.constraint(equalTo: view.topAnchor),
            leftStrip.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            rightStrip.leadingAnchor.constraint(equalTo: w.trailingAnchor),
            rightStrip.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            rightStrip.topAnchor.constraint(equalTo: view.topAnchor),
            rightStrip.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        web = w
        updateEdges()
        startStrips()

        Pads.shared.start { [weak self] js in self?.js(js) }
        load()
        if Test.on { Test.start(self) }
    }

    func load() {
        pageReady = false
        web.load(URLRequest(url: URL(string: SchemeHandler.scheme + "://app/assets/www/index.html")!))
    }

    // ---------- the page ----------
    func js(_ code: String) {
        guard web != nil else { return }
        web.evaluateJavaScript(code, completionHandler: nil)
    }

    func event(_ name: String, _ value: Any? = nil) {
        js("window.__cosmoEvent && __cosmoEvent('\(name)', \(Bridge.json(value)))")
    }

    func done(_ id: Int, _ result: Any?) {
        js("window.__cosmoDone && __cosmoDone(\(id), \(Bridge.json(result)))")
    }

    func userContentController(_ uc: WKUserContentController, didReceive m: WKScriptMessage) {
        guard let a = m.body as? [Any], a.count == 3, let id = (a[0] as? NSNumber)?.intValue,
              let name = a[1] as? String, let args = a[2] as? String else { return }
        bridge.call(id: id, name: name, argsJson: args)
    }

    // sync calls from the page
    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String, defaultText: String?,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (String?) -> Void) {
        if prompt == Bridge.syncTag {
            completionHandler(bridge.sync(defaultText ?? ""))
            return
        }
        let a = UIAlertController(title: nil, message: prompt, preferredStyle: .alert)
        a.addTextField { $0.text = defaultText }
        a.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(nil) })
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(a.textFields?.first?.text ?? "") })
        presentTop(a)
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping () -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        presentTop(a)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping (Bool) -> Void) {
        let a = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        a.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
        a.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        presentTop(a)
    }

    // links to websites open in Safari; only the CosmoU page itself stays in here
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { return decisionHandler(.cancel) }
        if url.scheme == SchemeHandler.scheme || url.scheme == "about" || url.scheme == "blob" || url.scheme == "data" {
            return decisionHandler(.allow)
        }
        if action.targetFrame?.isMainFrame ?? true, ["https", "http", "mailto"].contains(url.scheme ?? "") {
            UIApplication.shared.open(url)
        }
        decisionHandler(.cancel)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction,
                 windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let url = action.request.url, url.scheme == "https" { UIApplication.shared.open(url) }
        return nil
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        pageReady = true
        sendViewSize()
    }

    // iOS stopped the page in the background (low memory): load it again
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        NSLog("CosmoU: the page stopped, loading it again")
        load()
    }

    // ---------- the app ----------
    func handleURL(_ url: URL) {
        if url.scheme == "cosmou", url.host == "melocafe" || url.host == "melonx" { bridge.gamesArrived(url) }
    }

    func becameActive() {
        bridge.becameActive()
        startStrips()
        // play time ends when you come back to CosmoU
        js("window.__cosmoEvent && __cosmoEvent('resumed', {}); dispatchEvent(new Event('focus'))")
        // after a long time in the background iOS may have emptied the page
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            guard let self = self else { return }
            self.web.evaluateJavaScript("!!(window.api && document.body)") { v, _ in
                if (v as? Bool) != true, self.pageReady { self.load() }
            }
        }
    }

    func resignedActive() {
        bridge.resignedActive()
        stripTimer?.invalidate()
        stripTimer = nil
    }

    override func traitCollectionDidChange(_ previous: UITraitCollection?) {
        super.traitCollectionDidChange(previous)
        if previous?.userInterfaceStyle != traitCollection.userInterfaceStyle {
            event("night", traitCollection.userInterfaceStyle == .dark)
        }
    }

    override func viewWillTransition(to size: CGSize, with coordinator: UIViewControllerTransitionCoordinator) {
        super.viewWillTransition(to: size, with: coordinator)
        coordinator.animate(alongsideTransition: nil) { [weak self] _ in
            self?.updateEdges()
            self?.sendViewSize()
        }
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        updateEdges()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        sendViewSize()
    }

    // iPhones with a Dynamic Island (or notch): iOS keeps the same room free on both sides in landscape, but the
    // island is only on one side. That side keeps its room; the other side only needs a little for the round corners.
    // On an iPhone 17 Pro that gives the page about 40 points (5 %) more width.
    private func updateEdges() {
        guard leftEdge != nil else { return }
        let ins = view.safeAreaInsets
        var l = ins.left, r = ins.right
        let side = max(l, r)
        if UIDevice.current.userInterfaceIdiom == .phone, side > 30, abs(l - r) < 1 {
            let corner = min(side, 20)
            switch view.window?.windowScene?.interfaceOrientation ?? .landscapeRight {
            case .landscapeRight: r = corner  // home bar on the right: the island is on the left
            case .landscapeLeft: l = corner
            default: break
            }
        }
        if leftEdge.constant != l || rightEdge.constant != r {
            leftEdge.constant = l
            rightEdge.constant = r
            view.layoutIfNeeded()
            sampleStrips()
        }
    }

    // ---------- the strips next to the page: a soft gradient from the page's own edge ----------
    private func startStrips() {
        guard stripTimer == nil else { return }
        stripTimer = Timer.scheduledTimer(withTimeInterval: 0.7, repeats: true) { [weak self] _ in self?.sampleStrips() }
    }

    private func sampleStrips() {
        guard let w = web, pageReady, w.bounds.height > 0, w.bounds.width > 24 else { return }
        let h = w.bounds.height
        sample(CGRect(x: 0, y: 0, width: 12, height: h), into: leftStrip)
        sample(CGRect(x: w.bounds.width - 12, y: 0, width: 12, height: h), into: rightStrip)
    }

    private func sample(_ r: CGRect, into strip: UIImageView) {
        guard strip.bounds.width >= 1 else { return }
        let c = WKSnapshotConfiguration()
        c.rect = r
        c.snapshotWidth = 4
        c.afterScreenUpdates = false
        web.takeSnapshot(with: c) { img, _ in
            guard let img = img, let g = MainViewController.gradient(img) else { return }
            if let old = strip.image, old.pngData() == g.pngData() { return }
            UIView.transition(with: strip, duration: 0.35, options: [.transitionCrossDissolve, .allowUserInteraction]) {
                strip.image = g
            }
        }
    }

    // the snapshot of the page's edge, made into a 1 × 16 picture (each pixel the average of its part of the edge)
    private static func gradient(_ img: UIImage) -> UIImage? {
        guard let cg = img.cgImage else { return nil }
        let n = 16
        var px = [UInt8](repeating: 0, count: 4 * n)
        let space = CGColorSpaceCreateDeviceRGB()
        let info = CGImageAlphaInfo.noneSkipLast.rawValue
        let drawn: Bool = px.withUnsafeMutableBytes { buf in
            guard let ctx = CGContext(data: buf.baseAddress, width: 1, height: n, bitsPerComponent: 8, bytesPerRow: 4,
                                      space: space, bitmapInfo: info) else { return false }
            ctx.interpolationQuality = .high
            ctx.draw(cg, in: CGRect(x: 0, y: 0, width: 1, height: n))
            return true
        }
        guard drawn, let prov = CGDataProvider(data: Data(px) as CFData),
              let out = CGImage(width: 1, height: n, bitsPerComponent: 8, bitsPerPixel: 32, bytesPerRow: 4, space: space,
                                bitmapInfo: CGBitmapInfo(rawValue: info), provider: prov, decode: nil, shouldInterpolate: true,
                                intent: .defaultIntent) else { return nil }
        return UIImage(cgImage: out)
    }

    // WebKit draws pages with at most 60 frames per second unless its "Prefer Page Rendering Updates near 60fps"
    // feature is off (Safari has it under Feature Flags). Turned off here, the page follows ProMotion up to 120 Hz.
    private static func allow120Hz(_ p: WKPreferences) -> Bool {
        let cls: AnyObject = WKPreferences.self
        let listSel = NSSelectorFromString("_features"), setSel = NSSelectorFromString("_setEnabled:forFeature:")
        guard cls.responds(to: listSel), p.responds(to: setSel),
              let list = cls.perform(listSel)?.takeUnretainedValue() as? [NSObject] else { return false }
        typealias SetFn = @convention(c) (AnyObject, Selector, Bool, AnyObject) -> Void
        let set = unsafeBitCast(p.method(for: setSel), to: SetFn.self)
        var done = false
        for f in list where f.responds(to: NSSelectorFromString("key")) {
            if let key = f.value(forKey: "key") as? String, key.contains("PreferPageRenderingUpdatesNear60FPS") {
                set(p, setSel, false, f)
                done = true
            }
        }
        return done
    }

    private var lastSize = CGSize.zero
    private func sendViewSize() {
        guard let w = web, w.bounds.size != lastSize, w.bounds.width > 0 else { return }
        lastSize = w.bounds.size
        event("viewsize", [w.bounds.width, w.bounds.height])
    }

    // the strips next to the notch take the page's color
    func setStripColor(_ css: String) {
        let n = css.components(separatedBy: CharacterSet(charactersIn: "0123456789.").inverted)
            .filter { !$0.isEmpty }.compactMap { Double($0) }
        guard n.count >= 3 else { return }
        let alpha = n.count >= 4 ? n[3] : 1
        if alpha < 0.5 { return }
        let c = UIColor(red: n[0] / 255, green: n[1] / 255, blue: n[2] / 255, alpha: 1)
        view.backgroundColor = c
        if leftStrip.image == nil { leftStrip.backgroundColor = c }
        if rightStrip.image == nil { rightStrip.backgroundColor = c }
    }

    func presentTop(_ vc: UIViewController) {
        var top: UIViewController = self
        while let p = top.presentedViewController { top = p }
        if let pop = vc.popoverPresentationController {
            pop.sourceView = view
            pop.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 1, height: 1)
            pop.permittedArrowDirections = []
        }
        top.present(vc, animated: true)
    }
}

// WKUserContentController keeps its handlers alive; this keeps it from keeping the window alive too
final class WeakHandler: NSObject, WKScriptMessageHandler {
    weak var target: WKScriptMessageHandler?
    init(_ t: WKScriptMessageHandler) { target = t }
    func userContentController(_ uc: WKUserContentController, didReceive m: WKScriptMessage) {
        target?.userContentController(uc, didReceive: m)
    }
}
