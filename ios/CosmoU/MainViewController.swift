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
        // next to the notch, not under it; top and bottom go to the edge (the home bar hides by itself)
        NSLayoutConstraint.activate([
            w.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            w.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
            w.topAnchor.constraint(equalTo: view.topAnchor),
            w.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        web = w

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
        if url.scheme == "cosmou", url.host == "melocafe" { bridge.gamesArrived(url) }
    }

    func becameActive() {
        bridge.becameActive()
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

    func resignedActive() { bridge.resignedActive() }

    override func traitCollectionDidChange(_ previous: UITraitCollection?) {
        super.traitCollectionDidChange(previous)
        if previous?.userInterfaceStyle != traitCollection.userInterfaceStyle {
            event("night", traitCollection.userInterfaceStyle == .dark)
        }
    }

    override func viewWillTransition(to size: CGSize, with coordinator: UIViewControllerTransitionCoordinator) {
        super.viewWillTransition(to: size, with: coordinator)
        coordinator.animate(alongsideTransition: nil) { [weak self] _ in self?.sendViewSize() }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        sendViewSize()
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
        view.backgroundColor = UIColor(red: n[0] / 255, green: n[1] / 255, blue: n[2] / 255, alpha: 1)
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
