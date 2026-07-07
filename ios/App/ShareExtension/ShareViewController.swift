//  ShareViewController.swift — Forkmap iOS Share Extension
//
//  Receives a URL (or text containing one) from the iOS share sheet and opens the
//  main app via `com.forkmap.app://import?url=<link>`. The app (CapacitorInit
//  appUrlOpen handler) turns that into `/?import=<link>` and opens the import sheet.
//
//  Opening the container app from an extension is timing-sensitive: it only works
//  once the view is in a window (so the responder chain reaches UIApplication),
//  hence the open runs from viewDidAppear, not viewDidLoad.

import UIKit
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

  private var pendingURL: URL?
  private var didOpen = false

  override func viewDidLoad() {
    super.viewDidLoad()
    extractSharedURL()
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    tryOpen()
  }

  // MARK: - Extract the shared link

  private func extractSharedURL() {
    guard
      let item = extensionContext?.inputItems.first as? NSExtensionItem,
      let providers = item.attachments
    else { return complete() }

    for provider in providers {
      if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
        provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] data, _ in
          self?.setURL((data as? URL)?.absoluteString)
        }
        return
      }
      if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
        provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] data, _ in
          self?.setURL(self?.firstURL(in: (data as? String) ?? ""))
        }
        return
      }
    }
    complete()
  }

  private func setURL(_ raw: String?) {
    DispatchQueue.main.async {
      guard
        let raw = raw,
        let enc = raw.addingPercentEncoding(withAllowedCharacters: .alphanumerics),
        let url = URL(string: "com.forkmap.app://import?url=\(enc)")
      else { return self.complete() }
      self.pendingURL = url
      self.tryOpen() // in case the item loaded after viewDidAppear
    }
  }

  // MARK: - Open the container app

  // The reliable pattern: finish the extension request FIRST, then open the host
  // app from the completion handler. Opening while the extension UI is still up
  // is what silently no-ops on modern iOS.
  private func tryOpen() {
    guard !didOpen, isViewLoaded, view.window != nil, let url = pendingURL else { return }
    didOpen = true
    extensionContext?.completeRequest(returningItems: []) { [weak self] _ in
      self?.openURL(url)
    }
  }

  @discardableResult
  @objc private func openURL(_ url: URL) -> Bool {
    var responder: UIResponder? = self
    while let r = responder {
      if let app = r as? UIApplication {
        return app.perform(#selector(openURL(_:)), with: url) != nil
      }
      responder = r.next
    }
    // Fallback for contexts where UIApplication isn't in the chain.
    extensionContext?.open(url, completionHandler: nil)
    return false
  }

  private func firstURL(in text: String) -> String? {
    let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
    let range = NSRange(text.startIndex..., in: text)
    return detector?.firstMatch(in: text, options: [], range: range)?.url?.absoluteString
  }

  private func complete() {
    extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
  }
}
