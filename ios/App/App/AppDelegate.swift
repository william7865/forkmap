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
import AVFoundation

@objc(OcrPlugin)
public class OcrPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "OcrPlugin"
    public let jsName = "Ocr"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "recognize", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "recognizeVideo", returnType: CAPPluginReturnPromise)
    ]

    /** Run Vision text recognition on one CGImage, top-to-bottom. */
    private func recognizeLines(in cgImage: CGImage) -> [String] {
        let request = VNRecognizeTextRequest()
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        request.recognitionLanguages = ["fr-FR", "en-US"]
        try? VNImageRequestHandler(cgImage: cgImage, options: [:]).perform([request])
        let observations = (request.results as? [VNRecognizedTextObservation]) ?? []
        return observations
            .sorted { $0.boundingBox.maxY > $1.boundingBox.maxY }
            .compactMap { $0.topCandidates(1).first?.string }
    }

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
            call.resolve(["lines": self.recognizeLines(in: cg)])
        }.resume()
    }

    // Download a video and OCR a few evenly-spaced frames (deduped, top-to-bottom).
    // The heavy last-resort signal — the resolver only calls it when everything
    // else failed. Downloading on the DEVICE also helps with IP-locked media URLs.
    @objc func recognizeVideo(_ call: CAPPluginCall) {
        guard let urlStr = call.getString("videoUrl"), let url = URL(string: urlStr) else {
            call.reject("bad url")
            return
        }
        let frameCount = max(1, min(call.getInt("frames") ?? 5, 8))
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.timeoutInterval = 15
        req.setValue(
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
            forHTTPHeaderField: "User-Agent")

        URLSession.shared.dataTask(with: req) { data, _, err in
            if let err = err {
                call.reject(err.localizedDescription)
                return
            }
            guard let data = data, !data.isEmpty else {
                call.resolve(["lines": [String]()])
                return
            }
            // AVURLAsset needs a file/remote URL, not in-memory bytes → temp file.
            let tmp = FileManager.default.temporaryDirectory
                .appendingPathComponent(UUID().uuidString + ".mp4")
            do { try data.write(to: tmp) } catch {
                call.resolve(["lines": [String]()])
                return
            }
            defer { try? FileManager.default.removeItem(at: tmp) }

            let asset = AVURLAsset(url: tmp)
            let generator = AVAssetImageGenerator(asset: asset)
            generator.appliesPreferredTrackTransform = true
            // Nearest keyframe is fine and much faster than exact seeking.
            generator.requestedTimeToleranceBefore = .positiveInfinity
            generator.requestedTimeToleranceAfter = .positiveInfinity

            let duration = CMTimeGetSeconds(asset.duration)
            guard duration.isFinite, duration > 0 else {
                call.resolve(["lines": [String]()])
                return
            }

            var seen = Set<String>()
            var ordered: [String] = []
            for i in 0..<frameCount {
                let fraction = (Double(i) + 0.5) / Double(frameCount) // skip the very ends
                let time = CMTime(seconds: duration * fraction, preferredTimescale: 600)
                guard let cg = try? generator.copyCGImage(at: time, actualTime: nil) else { continue }
                for line in self.recognizeLines(in: cg) {
                    let key = line.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
                    if !key.isEmpty && !seen.contains(key) {
                        seen.insert(key)
                        ordered.append(line)
                    }
                }
            }
            call.resolve(["lines": ordered])
        }.resume()
    }
}

// ============================================================
// PageScrape — charge une page dans une WKWebView hors écran, y exécute du
// JavaScript, et rend le résultat.
//
// POURQUOI. La galerie photos d'une fiche Google (plats, salle, devanture)
// n'existe qu'APRÈS exécution du JavaScript de la page. Vérifié sans succès en
// requête simple : URL canonique /maps/place/…, preview/place, photometa/v1,
// async/lcl_akp, recherche par ludocid — tous rendent UNE image. Il faut donc
// un vrai navigateur, et l'app EN EST un : inutile de payer un serveur.
//
// Même raisonnement que RawHttp plus haut : la requête part de l'appareil,
// donc d'une IP résidentielle, là où Google bloque l'IP unique de Vercel.
// ============================================================
import WebKit

@objc(PageScrapePlugin)
public class PageScrapePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PageScrapePlugin"
    public let jsName = "PageScrape"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "evaluate", returnType: CAPPluginReturnPromise)
    ]

    /// Une seule page à la fois : chaque WKWebView coûte un processus de rendu.
    private var scrapeView: WKWebView?
    private var pending: CAPPluginCall?
    private var script = "''"
    private var settleMs = 3500
    private var finished = false

    @objc func evaluate(_ call: CAPPluginCall) {
        guard let urlStr = call.getString("url"), let url = URL(string: urlStr) else {
            call.reject("bad url")
            return
        }
        guard pending == nil else {
            call.reject("busy")
            return
        }
        pending = call
        script = call.getString("script") ?? "''"
        settleMs = call.getInt("settleMs") ?? 3500
        finished = false

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let config = WKWebViewConfiguration()
            // Éphémère : cette navigation ne doit rien mêler à la session de
            // l'utilisateur, ni laisser de trace après l'appel.
            config.websiteDataStore = .nonPersistent()
            let wv = WKWebView(frame: CGRect(x: 0, y: 0, width: 1, height: 1), configuration: config)
            wv.navigationDelegate = self
            wv.customUserAgent =
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                + "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
            // ⚠️ Hors hiérarchie de vues, iOS suspend le rendu et la page ne
            // finit jamais de se construire. D'où l'ajout en taille quasi nulle.
            if let win = UIApplication.shared.windows.first {
                wv.alpha = 0.01
                wv.isUserInteractionEnabled = false
                win.addSubview(wv)
                win.sendSubviewToBack(wv)
            }
            self.scrapeView = wv

            // Sans ces cookies, le mur de consentement européen remplace la page.
            let store = wv.configuration.websiteDataStore.httpCookieStore
            let group = DispatchGroup()
            for (name, value) in [
                ("SOCS", "CAISHAgBEhJnd3NfMjAyMzA4MTAtMF9SQzIaAmVuIAEaBgiA_LymBg"),
                ("CONSENT", "YES+cb.20210328-17-p0.en+FX+"),
            ] {
                if let cookie = HTTPCookie(properties: [
                    .domain: ".google.com", .path: "/", .name: name, .value: value,
                ]) {
                    group.enter()
                    store.setCookie(cookie) { group.leave() }
                }
            }
            group.notify(queue: .main) {
                var req = URLRequest(url: url)
                req.timeoutInterval = 20
                wv.load(req)
            }

            // Filet : une page qui ne finit jamais ne doit pas laisser l'appel
            // en suspens indéfiniment.
            DispatchQueue.main.asyncAfter(deadline: .now() + 25) { [weak self] in
                self?.finish(result: nil, error: "timeout")
            }
        }
    }

    private func finish(result: String?, error: String?) {
        guard !finished, let call = pending else { return }
        finished = true
        pending = nil
        scrapeView?.removeFromSuperview()
        scrapeView?.navigationDelegate = nil
        scrapeView = nil
        if let error = error {
            call.reject(error)
        } else {
            call.resolve(["result": result ?? ""])
        }
    }
}

extension PageScrapePlugin: WKNavigationDelegate {
    public func webView(_ wv: WKWebView, didFinish navigation: WKNavigation!) {
        // `didFinish` ne veut pas dire « page construite » : le contenu arrive
        // ensuite, par XHR.
        //
        // On INTERROGE au lieu d'attendre un délai fixe. Une attente de 3,5 s
        // faisait patienter 5 à 8 secondes sur une fiche déjà prête au bout
        // d'une seconde — un temps mort visible à chaque ouverture. `settleMs`
        // devient un PLAFOND, pas une durée.
        poll(wv, elapsed: 0)
    }

    /// Rappelle `script` toutes les 300 ms jusqu'à ce qu'il rende autre chose
    /// que la chaîne vide, ou jusqu'au plafond.
    private func poll(_ wv: WKWebView, elapsed: Int) {
        guard !finished else { return }
        wv.evaluateJavaScript(script) { [weak self] value, err in
            guard let self = self, !self.finished else { return }
            if let err = err {
                // Une page encore en construction fait échouer l'évaluation :
                // ce n'est pas une erreur définitive tant qu'il reste du temps.
                if elapsed >= self.settleMs {
                    self.finish(result: nil, error: err.localizedDescription)
                } else {
                    self.retry(wv, elapsed: elapsed)
                }
                return
            }
            let text = value as? String
            if let text = text, !text.isEmpty {
                self.finish(result: text, error: nil)
            } else if elapsed >= self.settleMs {
                self.finish(result: text, error: nil)
            } else {
                self.retry(wv, elapsed: elapsed)
            }
        }
    }

    private func retry(_ wv: WKWebView, elapsed: Int) {
        let step = 300
        DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(step)) { [weak self] in
            self?.poll(wv, elapsed: elapsed + step)
        }
    }

    public func webView(_ wv: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        finish(result: nil, error: error.localizedDescription)
    }

    public func webView(
        _ wv: WKWebView,
        didFailProvisionalNavigation navigation: WKNavigation!,
        withError error: Error
    ) {
        finish(result: nil, error: error.localizedDescription)
    }
}

// Registers app-local plugins (RawHttp, AppGroup, Ocr, PageScrape). Capacitor
// does not auto-discover plugins defined in the app target, so we register them
// on the bridge here. Wired via Main.storyboard (the initial view controller's
// class).
class MainViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(RawHttpPlugin())
        bridge?.registerPluginInstance(AppGroupPlugin())
        bridge?.registerPluginInstance(OcrPlugin())
        bridge?.registerPluginInstance(PageScrapePlugin())
    }
}
