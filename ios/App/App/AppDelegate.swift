import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

// ============================================================
// RawHttp — minimal native GET returning the RAW response body as text.
// Needed because CapacitorHttp force-parses `application/json` responses, and
// Google's map endpoint serves an XSSI-prefixed (`)]}'`) blob as application/json
// that isn't valid JSON. A raw URLSession request from the DEVICE also exits via
// the user's residential IP (Google blocks the single Vercel datacenter IP).
// Kept in AppDelegate.swift so it's in the App target without editing the Xcode
// project; Capacitor auto-discovers CAPBridgedPlugin conformers at runtime.
// ============================================================
import Capacitor

@objc(RawHttpPlugin)
public class RawHttpPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RawHttpPlugin"
    public let jsName = "RawHttp"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise)
    ]

    @objc func get(_ call: CAPPluginCall) {
        guard let urlStr = call.getString("url"), let url = URL(string: urlStr) else {
            call.reject("bad url")
            return
        }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.timeoutInterval = 12
        if let headers = call.getObject("headers") {
            for (key, value) in headers {
                if let s = value as? String { req.setValue(s, forHTTPHeaderField: key) }
            }
        }
        URLSession.shared.dataTask(with: req) { data, resp, err in
            if let err = err {
                call.reject(err.localizedDescription)
                return
            }
            let status = (resp as? HTTPURLResponse)?.statusCode ?? 0
            let text = data.flatMap { String(data: $0, encoding: .utf8) } ?? ""
            call.resolve(["status": status, "data": text])
        }.resume()
    }
}

// Registers app-local plugins (RawHttp). Capacitor does not auto-discover
// plugins defined in the app target, so we register them on the bridge here.
// Wired via Main.storyboard (the initial view controller's custom class).
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(RawHttpPlugin())
    }
}
