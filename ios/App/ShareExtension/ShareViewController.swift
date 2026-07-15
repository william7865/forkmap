//  ShareViewController.swift — Forkmap iOS Share Extension
//
//  The whole product is this gesture: the user is watching a TikTok, shares it
//  to Forkmap, a small sheet says "Enregistré !", they may type a note, tap
//  "Terminé" — and they are STILL in TikTok. Under a second, no spinner, no
//  app switch.
//
//  So the extension is autonomous: it shows its sheet immediately (before it
//  knows anything about the restaurant), then posts the import itself to
//  POST {API}/api/imports with the auth token the app published in the shared
//  App Group. It NEVER opens the container app (the old `openURL` did, and that
//  ejected the user out of TikTok — it is gone).
//
//  Nothing is ever lost: the share is queued in the App Group before the POST,
//  and only dequeued once the server confirms. No token (signed out) or no
//  network (metro) simply leaves it in the queue, which the app drains at its
//  next launch.
//
//  We give the extension a real view (loadView) so it presents properly and its
//  view enters a window — otherwise viewDidAppear never fires.

import UIKit
import UniformTypeIdentifiers

class ShareViewController: UIViewController {

  // MARK: - Config

  /// The extension has no access to the Next.js env — hardcode the API base.
  private let apiBase = "https://forkmap.vercel.app"
  /// Must match lib/native/app-group.ts + AppDelegate.swift (AppGroupPlugin).
  private let appGroup = "group.com.forkmap.app"
  private let tokenKey = "authToken"
  private let pendingKey = "pendingShares"

  /// Hard caps. The sheet must never hang: whatever happens, we complete.
  private let autoFinishDelay: TimeInterval = 4.0   // untouched sheet → auto-save
  private let requestTimeout: TimeInterval = 6.0    // URLSession timeout
  private let dismissDeadline: TimeInterval = 1.5   // never keep the user waiting longer

  // MARK: - State

  private var sharedURL: String?
  private var extractionDone = false
  private var finishRequested = false
  private var didSubmit = false
  private var didComplete = false
  private var autoFinishTimer: Timer?

  private var sharedDefaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

  // MARK: - UI

  private let card = UIView()
  private let noteField = UITextField()
  private let doneButton = UIButton(type: .system)
  private var cardBottom: NSLayoutConstraint?

  override func loadView() {
    let root = UIView()
    root.backgroundColor = UIColor.black.withAlphaComponent(0.3)

    // Card
    card.backgroundColor = .systemBackground
    card.layer.cornerRadius = 22
    card.layer.cornerCurve = .continuous
    card.translatesAutoresizingMaskIntoConstraints = false
    root.addSubview(card)

    // Logo — an SF Symbol, so the extension needs no asset catalog of its own.
    let logo = UIImageView(image: UIImage(systemName: "fork.knife"))
    logo.tintColor = .label
    logo.contentMode = .scaleAspectFit
    logo.translatesAutoresizingMaskIntoConstraints = false

    let logoBox = UIView()
    logoBox.backgroundColor = .secondarySystemBackground
    logoBox.layer.cornerRadius = 14
    logoBox.layer.cornerCurve = .continuous
    logoBox.translatesAutoresizingMaskIntoConstraints = false
    logoBox.addSubview(logo)

    let title = UILabel()
    title.text = "Enregistré !"
    title.textColor = .label
    title.font = .systemFont(ofSize: 22, weight: .bold)

    let subtitle = UILabel()
    subtitle.text = "Forkmap trouve le restaurant pour vous."
    subtitle.textColor = .secondaryLabel
    subtitle.font = .systemFont(ofSize: 14, weight: .regular)
    subtitle.numberOfLines = 2

    let text = UIStackView(arrangedSubviews: [title, subtitle])
    text.axis = .vertical
    text.spacing = 2

    let header = UIStackView(arrangedSubviews: [logoBox, text])
    header.axis = .horizontal
    header.alignment = .center
    header.spacing = 12
    header.translatesAutoresizingMaskIntoConstraints = false

    noteField.placeholder = "Ajouter une note"
    noteField.borderStyle = .none
    noteField.backgroundColor = .secondarySystemBackground
    noteField.layer.cornerRadius = 12
    noteField.layer.cornerCurve = .continuous
    noteField.font = .systemFont(ofSize: 16)
    noteField.returnKeyType = .done
    noteField.delegate = self
    noteField.autocorrectionType = .yes
    // Inner padding
    let pad = UIView(frame: CGRect(x: 0, y: 0, width: 12, height: 1))
    noteField.leftView = pad
    noteField.leftViewMode = .always
    noteField.rightView = UIView(frame: CGRect(x: 0, y: 0, width: 12, height: 1))
    noteField.rightViewMode = .always
    noteField.translatesAutoresizingMaskIntoConstraints = false
    noteField.addTarget(self, action: #selector(noteEditingBegan), for: .editingDidBegin)

    doneButton.setTitle("Terminé", for: .normal)
    doneButton.setTitleColor(.systemBackground, for: .normal)
    doneButton.titleLabel?.font = .systemFont(ofSize: 17, weight: .semibold)
    doneButton.backgroundColor = .label
    doneButton.layer.cornerRadius = 14
    doneButton.layer.cornerCurve = .continuous
    doneButton.translatesAutoresizingMaskIntoConstraints = false
    doneButton.addTarget(self, action: #selector(didTapDone), for: .touchUpInside)

    card.addSubview(header)
    card.addSubview(noteField)
    card.addSubview(doneButton)

    let bottom = card.bottomAnchor.constraint(equalTo: root.safeAreaLayoutGuide.bottomAnchor, constant: -12)
    cardBottom = bottom

    NSLayoutConstraint.activate([
      card.leadingAnchor.constraint(equalTo: root.leadingAnchor, constant: 12),
      card.trailingAnchor.constraint(equalTo: root.trailingAnchor, constant: -12),
      bottom,

      logoBox.widthAnchor.constraint(equalToConstant: 44),
      logoBox.heightAnchor.constraint(equalToConstant: 44),
      logo.centerXAnchor.constraint(equalTo: logoBox.centerXAnchor),
      logo.centerYAnchor.constraint(equalTo: logoBox.centerYAnchor),
      logo.widthAnchor.constraint(equalToConstant: 24),
      logo.heightAnchor.constraint(equalToConstant: 24),

      header.topAnchor.constraint(equalTo: card.topAnchor, constant: 20),
      header.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 20),
      header.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -20),

      noteField.topAnchor.constraint(equalTo: header.bottomAnchor, constant: 18),
      noteField.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 20),
      noteField.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -20),
      noteField.heightAnchor.constraint(equalToConstant: 48),

      doneButton.topAnchor.constraint(equalTo: noteField.bottomAnchor, constant: 12),
      doneButton.leadingAnchor.constraint(equalTo: card.leadingAnchor, constant: 20),
      doneButton.trailingAnchor.constraint(equalTo: card.trailingAnchor, constant: -20),
      doneButton.heightAnchor.constraint(equalToConstant: 50),
      doneButton.bottomAnchor.constraint(equalTo: card.bottomAnchor, constant: -20),
    ])

    // Tapping outside the card saves too — the fastest possible exit.
    let tap = UITapGestureRecognizer(target: self, action: #selector(didTapBackdrop(_:)))
    tap.cancelsTouchesInView = false
    root.addGestureRecognizer(tap)

    self.view = root
  }

  override func viewDidLoad() {
    super.viewDidLoad()
    extractSharedURL()
    NotificationCenter.default.addObserver(
      self, selector: #selector(keyboardWillChange(_:)),
      name: UIResponder.keyboardWillChangeFrameNotification, object: nil)
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    // Safety net: an untouched sheet saves itself and gets out of the way.
    autoFinishTimer?.invalidate()
    autoFinishTimer = Timer.scheduledTimer(withTimeInterval: autoFinishDelay, repeats: false) {
      [weak self] _ in self?.finish()
    }
  }

  // MARK: - Interaction

  @objc private func noteEditingBegan() {
    // The user is engaged — no more auto-save behind their back.
    autoFinishTimer?.invalidate()
    autoFinishTimer = nil
  }

  @objc private func didTapDone() {
    finish()
  }

  @objc private func didTapBackdrop(_ gesture: UITapGestureRecognizer) {
    let point = gesture.location(in: view)
    if card.frame.contains(point) { return }
    finish()
  }

  @objc private func keyboardWillChange(_ note: Notification) {
    guard
      let frame = note.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect,
      let root = viewIfLoaded
    else { return }
    let overlap = max(0, root.bounds.maxY - root.safeAreaInsets.bottom - frame.minY)
    cardBottom?.constant = -12 - overlap
    UIView.animate(withDuration: 0.2) { root.layoutIfNeeded() }
  }

  // MARK: - Extract the shared link (unchanged — this part works)

  private func extractSharedURL() {
    guard
      let item = extensionContext?.inputItems.first as? NSExtensionItem,
      let providers = item.attachments
    else { return extractionFinished(nil) }

    for provider in providers {
      if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
        provider.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] data, _ in
          self?.extractionFinished((data as? URL)?.absoluteString)
        }
        return
      }
      if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
        provider.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] data, _ in
          self?.extractionFinished(self?.firstURL(in: (data as? String) ?? ""))
        }
        return
      }
    }
    extractionFinished(nil)
  }

  private func extractionFinished(_ raw: String?) {
    DispatchQueue.main.async {
      self.extractionDone = true
      if let raw = raw, let url = URL(string: raw), url.scheme?.hasPrefix("http") == true {
        self.sharedURL = raw
      }
      // The user may already have tapped "Terminé" before the link landed.
      if self.finishRequested { self.submit() }
    }
  }

  private func firstURL(in text: String) -> String? {
    let detector = try? NSDataDetector(types: NSTextCheckingResult.CheckingType.link.rawValue)
    let range = NSRange(text.startIndex..., in: text)
    return detector?.firstMatch(in: text, options: [], range: range)?.url?.absoluteString
  }

  // MARK: - Save

  /// Called by "Terminé", by a tap outside, or by the inactivity timer.
  private func finish() {
    guard !finishRequested else { return }
    finishRequested = true
    autoFinishTimer?.invalidate()
    autoFinishTimer = nil
    view.endEditing(true)
    doneButton.isEnabled = false

    if extractionDone {
      submit()
    } else {
      // Still reading the attachment. Give it a moment, then bail out anyway —
      // the sheet must never hang.
      DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) { [weak self] in self?.submit() }
    }
  }

  private func submit() {
    guard !didSubmit else { return }
    didSubmit = true

    let note = noteField.text?.trimmingCharacters(in: .whitespacesAndNewlines)
    guard let link = sharedURL else { return complete() }

    // Queue FIRST: whatever happens next (process killed on completeRequest,
    // network down, no token), the share survives and the app posts it later.
    enqueue(url: link, note: note)

    guard
      let token = sharedDefaults?.string(forKey: tokenKey), !token.isEmpty,
      let endpoint = URL(string: "\(apiBase)/api/imports")
    else {
      // Signed out (or the App Group isn't wired) — the queue is the fallback.
      return complete()
    }

    var body: [String: Any] = ["url": link, "platform": platform(for: link)]
    if let note = note, !note.isEmpty { body["note"] = note }

    var req = URLRequest(url: endpoint)
    req.httpMethod = "POST"
    req.timeoutInterval = requestTimeout
    req.setValue("application/json", forHTTPHeaderField: "Content-Type")
    req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
    req.httpBody = try? JSONSerialization.data(withJSONObject: body)

    URLSession.shared.dataTask(with: req) { [weak self] _, resp, _ in
      guard let self = self else { return }
      let status = (resp as? HTTPURLResponse)?.statusCode ?? 0
      if (200..<300).contains(status) {
        // Confirmed server-side — drop it from the queue so the app doesn't repost.
        self.dequeue(url: link)
      }
      DispatchQueue.main.async { self.complete() }
    }.resume()

    // Hard deadline: we close the sheet even if the network is slow. The share
    // is already queued, so a killed request costs nothing.
    DispatchQueue.main.asyncAfter(deadline: .now() + dismissDeadline) { [weak self] in
      self?.complete()
    }
  }

  /// Mirrors `platformFromUrl` in lib/import/parse.ts.
  private func platform(for url: String) -> String {
    let u = url.lowercased()
    if u.contains("tiktok.") { return "tiktok" }
    if u.contains("instagram.") { return "instagram" }
    if u.contains("youtube.") || u.contains("youtu.be") { return "youtube" }
    return "other"
  }

  // MARK: - Offline queue (App Group)

  private func enqueue(url: String, note: String?) {
    guard let store = sharedDefaults else { return }
    var queue = store.array(forKey: pendingKey) as? [[String: Any]] ?? []
    queue.removeAll { ($0["url"] as? String) == url } // re-share: keep one entry
    var item: [String: Any] = ["url": url]
    if let note = note, !note.isEmpty { item["note"] = note }
    queue.append(item)
    if queue.count > 50 { queue.removeFirst(queue.count - 50) }
    store.set(queue, forKey: pendingKey)
  }

  private func dequeue(url: String) {
    guard let store = sharedDefaults else { return }
    var queue = store.array(forKey: pendingKey) as? [[String: Any]] ?? []
    queue.removeAll { ($0["url"] as? String) == url }
    store.set(queue, forKey: pendingKey)
  }

  // MARK: - Exit

  /// Idempotent, main-thread. The user is never left on a spinner.
  private func complete() {
    guard !didComplete else { return }
    didComplete = true
    autoFinishTimer?.invalidate()
    extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
  }
}

extension ShareViewController: UITextFieldDelegate {
  func textFieldShouldReturn(_ textField: UITextField) -> Bool {
    finish()
    return true
  }
}
