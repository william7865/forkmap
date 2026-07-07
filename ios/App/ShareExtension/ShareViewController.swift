//  ShareViewController.swift — Forkmap iOS Share Extension
//
//  Receives a URL (or text containing one) from the iOS share sheet and opens the
//  main app via `com.forkmap.app://import?url=<link>`. The app (CapacitorInit
//  appUrlOpen handler) turns that into `/?import=<link>` and opens the import sheet.
//
//  We give the extension a real view (loadView) so it presents properly and its
//  view enters a window — otherwise viewDidAppear never fires and the responder
//  chain never reaches UIApplication, so openURL silently no-ops.

import UIKit
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

  private var pendingURL: URL?
  private var didOpen = false

  // A minimal visible view guarantees the VC is presented in a window.
  override func loadView() {
    let root = UIView()
    root.backgroundColor = UIColor.systemBackground
    let label = UILabel()
    label.text = "Forkmap…"
    label.textColor = UIColor.label
    label.font = .systemFont(ofSize: 17, weight: .semibold)
    label.translatesAutoresizingMaskIntoConstraints = false
    root.addSubview(label)
    NSLayoutConstraint.activate([
      label.centerXAnchor.constraint(equalTo: root.centerXAnchor),
      label.centerYAnchor.constraint(equalTo: root.centerYAnchor),
    ])
    self.view = root
  }

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
      self.tryOpen()
    }
  }

  // MARK: - Open the container app (VC is alive and in a window here)

  private func tryOpen() {
    guard !didOpen, isViewLoaded, view.window != nil, let url = pendingURL else { return }
    didOpen = true
    openURL(url)
    DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { [weak self] in self?.complete() }
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
