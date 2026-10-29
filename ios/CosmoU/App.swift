// CosmoU for iPhone and iPad: the same window as on the computer, in a WKWebView (MainViewController),
// with a small bridge to iOS (Bridge). Games start in MeloCafe, the Wii U emulator for iOS (based on Cemu).
import AVFoundation
import UIKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // menu music plays along with other apps and stays quiet when the phone is set to silent
        try? AVAudioSession.sharedInstance().setCategory(.ambient)
        return true
    }

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let c = UISceneConfiguration(name: "Default", sessionRole: connectingSceneSession.role)
        c.delegateClass = SceneDelegate.self
        return c
    }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private var main: MainViewController? { window?.rootViewController as? MainViewController }

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let ws = scene as? UIWindowScene else { return }
        let w = UIWindow(windowScene: ws)
        let vc = MainViewController()
        w.rootViewController = vc
        w.makeKeyAndVisible()
        window = w
        for c in connectionOptions.urlContexts { vc.handleURL(c.url) }
    }

    // MeloCafe sends its game list back with a cosmou:// link
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for c in URLContexts { main?.handleURL(c.url) }
    }

    func sceneDidBecomeActive(_ scene: UIScene) { main?.becameActive() }
    func sceneWillResignActive(_ scene: UIScene) { main?.resignedActive() }
}
