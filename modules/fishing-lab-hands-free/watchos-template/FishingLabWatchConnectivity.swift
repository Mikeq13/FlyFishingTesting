import Foundation
import WatchConnectivity

struct FishingLabWatchOutingSummary: Codable {
  let targetRoute: String
  let sessionId: Int
  let experimentId: Int?
  let lastActiveAt: String
}

@MainActor
final class FishingLabWatchConnectivity: NSObject, ObservableObject, WCSessionDelegate {
  @Published var activeOuting: FishingLabWatchOutingSummary?
  @Published var isReachable = false
  @Published var lastStatusMessage = "Waiting for Fishing Lab on iPhone"

  private let session = WCSession.default

  override init() {
    super.init()
    session.delegate = self
    session.activate()
    isReachable = session.isReachable
  }

  func send(_ payload: [String: Any]) {
    guard session.isReachable else {
      session.transferUserInfo(payload)
      lastStatusMessage = "Queued for your paired iPhone"
      return
    }
    session.sendMessage(payload, replyHandler: nil) { [weak self] _ in
      Task { @MainActor in
        self?.lastStatusMessage = "Unable to reach Fishing Lab on iPhone"
      }
    }
    lastStatusMessage = "Sent to Fishing Lab"
  }

  func resumeOuting() {
    send(["action": "resume_outing"])
  }

  func addNote(_ text: String) {
    send(["action": "add_note", "noteText": text])
  }

  func changeWater(_ waterType: String) {
    send(["action": "change_water", "waterType": waterType])
  }

  func changeTechnique(_ technique: String) {
    send(["action": "change_technique", "technique": technique])
  }

  func logFish() {
    send(["action": "log_fish"])
  }

  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {}

  func sessionReachabilityDidChange(_ session: WCSession) {
    Task { @MainActor in
      isReachable = session.isReachable
    }
  }

  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
    guard let activeOutingRaw = applicationContext["activeOuting"] as? String,
          let data = activeOutingRaw.data(using: .utf8),
          let decoded = try? JSONDecoder().decode(FishingLabWatchOutingSummary.self, from: data) else {
      return
    }

    Task { @MainActor in
      activeOuting = decoded
      lastStatusMessage = "Current outing synced from iPhone"
    }
  }
}
