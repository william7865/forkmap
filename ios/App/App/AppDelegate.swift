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

// ============================================================
// AppGroup — read/write the shared container (group.com.forkmap.app).
//
// The Share Extension is a separate process: it can't reach the WebView's
// localStorage nor the Supabase session. The App Group is the only channel.
//  • the app publishes its access token here (setAuthToken) so the extension
//    can POST /api/imports on its own,
//  • the extension queues the shares it couldn't post (no token, no network)
//    and the app drains that queue at launch (getPendingShares/clearPendingShares).
//
// Keys must stay in sync with ShareExtension/ShareViewController.swift.
// ============================================================
@objc(AppGroupPlugin)
public class AppGroupPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppGroupPlugin"
    public let jsName = "AppGroup"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setAuthToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPendingShares", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearPendingShares", returnType: CAPPluginReturnPromise)
    ]

    private static let suiteName = "group.com.forkmap.app"
    private static let tokenKey = "authToken"
    private static let pendingKey = "pendingShares"

    private var shared: UserDefaults? { UserDefaults(suiteName: AppGroupPlugin.suiteName) }

    @objc func setAuthToken(_ call: CAPPluginCall) {
        guard let store = shared else {
            call.reject("app group unavailable")
            return
        }
        let token = call.getString("token")
        if let token = token, !token.isEmpty {
            store.set(token, forKey: AppGroupPlugin.tokenKey)
        } else {
            store.removeObject(forKey: AppGroupPlugin.tokenKey)
        }
        call.resolve()
    }

    @objc func getPendingShares(_ call: CAPPluginCall) {
        let raw = shared?.array(forKey: AppGroupPlugin.pendingKey) as? [[String: Any]] ?? []
        let shares: [[String: Any]] = raw.compactMap { item in
            guard let url = item["url"] as? String, !url.isEmpty else { return nil }
            var out: [String: Any] = ["url": url]
            if let note = item["note"] as? String, !note.isEmpty { out["note"] = note }
            return out
        }
        call.resolve(["shares": shares])
    }

    @objc func clearPendingShares(_ call: CAPPluginCall) {
        shared?.removeObject(forKey: AppGroupPlugin.pendingKey)
        call.resolve()
    }
}

// ============================================================
// Ocr — read the text printed on an image with Apple's Vision framework.
// Food reels stamp the venue's name on the thumbnail even when the caption never
// spells it out; recognising it on the DEVICE (free, offline, private) gives the
// import resolver a second pair of eyes. See lib/native/ocr.ts + lib/import/resolve.ts.
// ============================================================
import Vision

@objc(OcrPlugin)
public class OcrPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "OcrPlugin"
    public let jsName = "Ocr"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "recognize", returnType: CAPPluginReturnPromise)
    ]

    @objc func recognize(_ call: CAPPluginCall) {
        guard let urlStr = call.getString("imageUrl"), let url = URL(string: urlStr) else {
            call.reject("bad url")
            return
        }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.timeoutInterval = 12
        // Social CDNs 403 a default URLSession UA; a browser-ish one fetches the image.
        req.setValue(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
            forHTTPHeaderField: "User-Agent")

        URLSession.shared.dataTask(with: req) { data, _, err in
            if let err = err {
                call.reject(err.localizedDescription)
                return
            }
            guard let data = data, let image = UIImage(data: data), let cg = image.cgImage else {
                call.resolve(["lines": [String]()])
                return
            }

            let request = VNRecognizeTextRequest { req, _ in
                let observations = (req.results as? [VNRecognizedTextObservation]) ?? []
                // Vision returns observations unordered; sort top-to-bottom (its Y axis
                // is 0 at the bottom, 1 at the top) so a title card reads in order.
                let lines = observations
                    .sorted { $0.boundingBox.maxY > $1.boundingBox.maxY }
                    .compactMap { $0.topCandidates(1).first?.string }
                call.resolve(["lines": lines])
            }
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true
            request.recognitionLanguages = ["fr-FR", "en-US"]

            let handler = VNImageRequestHandler(cgImage: cg, options: [:])
            do {
                try handler.perform([request])
            } catch {
                call.resolve(["lines": [String]()])
            }
        }.resume()
    }
}

// Registers app-local plugins (RawHttp, AppGroup, Ocr). Capacitor does not
// auto-discover plugins defined in the app target, so we register them on the
// bridge here. Wired via Main.storyboard (the initial view controller's class).
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(RawHttpPlugin())
        bridge?.registerPluginInstance(AppGroupPlugin())
        bridge?.registerPluginInstance(OcrPlugin())
    }
}
