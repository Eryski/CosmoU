// A stand-in for MeloCafe, only for the automatic test in the iOS Simulator (MeloCafe itself runs on real devices only).
// It answers the same links: melocafe://gameInfo?scheme=… sends three test games back, melocafe://game?id=… shows
// which game it was asked to start. Every link it gets is written to Documents/links.txt for the test to read.
import UIKit

@main
final class StubAppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let c = UISceneConfiguration(name: "Default", sessionRole: connectingSceneSession.role)
        c.delegateClass = StubScene.self
        return c
    }
}

final class StubScene: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private let label = UILabel()

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options: UIScene.ConnectionOptions) {
        guard let ws = scene as? UIWindowScene else { return }
        let vc = UIViewController()
        vc.view.backgroundColor = UIColor(red: 0.13, green: 0.12, blue: 0.2, alpha: 1)
        label.numberOfLines = 0
        label.textAlignment = .center
        label.textColor = .white
        label.font = .boldSystemFont(ofSize: 30)
        label.text = "MeloCafe (test stand-in)"
        label.translatesAutoresizingMaskIntoConstraints = false
        vc.view.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: vc.view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: vc.view.centerYAnchor),
            label.widthAnchor.constraint(lessThanOrEqualTo: vc.view.widthAnchor, constant: -40),
        ])
        let w = UIWindow(windowScene: ws)
        w.rootViewController = vc
        w.makeKeyAndVisible()
        window = w
        for c in options.urlContexts { handle(c.url) }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for c in URLContexts { handle(c.url) }
    }

    private func log(_ s: String) {
        let f = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("links.txt")
        let line = s + "\n"
        if let h = try? FileHandle(forWritingTo: f) {
            h.seekToEndOfFile()
            h.write(Data(line.utf8))
            h.closeFile()
        } else {
            try? Data(line.utf8).write(to: f)
        }
        NSLog("MeloStub: %@", s)
    }

    private static let games: [(String, String, UIColor)] = [
        ("00050000101C9500", "The Legend of Zelda: Breath of the Wild", UIColor(red: 0.2, green: 0.55, blue: 0.75, alpha: 1)),
        ("000500001010ED00", "Mario Kart 8", UIColor(red: 0.85, green: 0.2, blue: 0.2, alpha: 1)),
        ("0005000010176A00", "Splatoon", UIColor(red: 0.95, green: 0.5, blue: 0.1, alpha: 1)),
    ]

    private static func icon(_ title: String, _ color: UIColor) -> Data {
        let r = UIGraphicsImageRenderer(size: CGSize(width: 128, height: 128), format: {
            let f = UIGraphicsImageRendererFormat()
            f.scale = 1
            return f
        }())
        let img = r.image { ctx in
            color.setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: 128, height: 128))
            let s = String(title.prefix(1)) as NSString
            s.draw(at: CGPoint(x: 40, y: 22), withAttributes: [.font: UIFont.boldSystemFont(ofSize: 72), .foregroundColor: UIColor.white])
        }
        return img.jpegData(compressionQuality: 0.5) ?? Data()
    }

    private func handle(_ url: URL) {
        log(url.absoluteString)
        let c = URLComponents(url: url, resolvingAgainstBaseURL: false)
        let q = { (n: String) in c?.queryItems?.first { $0.name == n }?.value }
        switch url.host {
        case "gameInfo":
            // the same answer as MeloCafe: [{id, title, path, icon (base64)}] as base64url JSON
            let list: [[String: Any]] = StubScene.games.map { g in
                ["id": NSNumber(value: UInt64(g.0, radix: 16)!), "title": g.1, "path": "/var/mobile/roms/" + g.1,
                 "icon": StubScene.icon(g.1, g.2).base64EncodedString()]
            }
            let data = (try? JSONSerialization.data(withJSONObject: list)) ?? Data()
            let b = data.base64EncodedString().replacingOccurrences(of: "+", with: "-")
                .replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
            label.text = "MeloCafe (test stand-in)\nsending \(list.count) games"
            if let scheme = q("scheme"), let back = URL(string: "\(scheme)://\(url.scheme ?? "melocafe")?games=\(b)") {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { UIApplication.shared.open(back) }
            }
        case "game":
            let id = q("id") ?? q("name") ?? "?"
            let name = StubScene.games.first { String(UInt64($0.0, radix: 16)!) == id }?.1 ?? id
            label.text = "MeloCafe (test stand-in)\nstarting \(name)"
        default:
            label.text = "MeloCafe (test stand-in)\nopened: " + url.absoluteString
        }
    }
}
