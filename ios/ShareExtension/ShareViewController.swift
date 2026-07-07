//  ShareViewController.swift — Forkmap iOS Share Extension
//
//  Receives a URL (or text containing one) from the iOS share sheet and hands it
//  to the main app via the custom scheme `com.forkmap.app://import?url=<link>`.
//  The app (CapacitorInit appUrlOpen handler) turns that into `/?import=<link>`,
//  which opens the import sheet. No App Group needed — everything goes through
//  the URL scheme.
//
//  SETUP: this file belongs to a Share Extension target you add in Xcode.
//  See ios/ShareExtension/README.md for the one-time steps.

import UIKit
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

  override func viewDidLoad() {
    super.viewDidLoad()
    handleShare()
  }

  private func handleShare() {
    guard
      let item = extensionContext?.inputItems.first as? NSExtensionItem,
      let providers = item.attachments
    else { return complete() }

    for provider in providers {
      if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
        provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] data, _ in
          if let url = data as? URL { self?.open(url.absoluteString) } else { self?.complete() }
        }
        return
      }
      if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
        provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] data, _ in
          if let text = data as? String, let url = self?.firstURL(in: text) { self?.open(url) }
          else { self?.complete() }
        }
        return
      }
    }
    complete()
  }

  private func firstURL(in text: String) -> String? {
    let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
    let range = NSRange(text.startIndex..., in: text)
    return detector?.firstMatch(in: text, options: [], range: range)?.url?.absoluteString
  }

  private func open(_ raw: String) {
    let encoded = raw.addingPercentEncoding(withAllowedCharacters: .alphanumerics) ?? raw
    if let url = URL(string: "com.forkmap.app://import?url=\(encoded)") {
      openHostApp(url)
    }
    complete()
  }

  // A share extension can't call UIApplication.shared.open directly; walk the
  // responder chain to find an object that responds to openURL:.
  private func openHostApp(_ url: URL) {
    var responder: UIResponder? = self
    let selector = sel_registerName("openURL:")
    while let r = responder {
      if r.responds(to: selector) {
        r.perform(selector, with: url)
        return
      }
      responder = r.next
    }
  }

  private func complete() {
    extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
  }
}
