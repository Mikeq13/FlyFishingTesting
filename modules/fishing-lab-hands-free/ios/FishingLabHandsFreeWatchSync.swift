import Foundation
#if canImport(WatchConnectivity)
import WatchConnectivity
#endif

let FishingLabPendingCommandKey = "fishing_lab.pending_handsfree_command"
let FishingLabPendingCommandQueueKey = "fishing_lab.pending_handsfree_commands"
let FishingLabActiveOutingKey = "fishing_lab.active_outing"
let FishingLabHandsFreePreferencesKey = "fishing_lab.hands_free_preferences"

private struct FishingLabWatchCompanionStatusPayload {
  let isSupported: Bool
  let isPaired: Bool
  let isWatchAppInstalled: Bool
  let isReachable: Bool
  let activationState: String

  var dictionary: [String: Any] {
    [
      "isSupported": isSupported,
      "isPaired": isPaired,
      "isWatchAppInstalled": isWatchAppInstalled,
      "isReachable": isReachable,
      "activationState": activationState
    ]
  }
}

final class FishingLabWatchSyncManager: NSObject {
  static let shared = FishingLabWatchSyncManager()

  private let defaults = UserDefaults.standard

  #if canImport(WatchConnectivity)
  private var session: WCSession?
  #endif

  private override init() {
    super.init()
    activateSessionIfPossible()
  }

  func queuePendingCommand(_ payload: [String: Any]) throws {
    let data = try JSONSerialization.data(withJSONObject: payload, options: [])
    guard let encoded = String(data: data, encoding: .utf8) else {
      throw NSError(domain: "FishingLabHandsFree", code: 1, userInfo: [NSLocalizedDescriptionKey: "Could not encode the pending command."])
    }

    var queue = defaults.stringArray(forKey: FishingLabPendingCommandQueueKey) ?? []
    queue.append(encoded)
    defaults.set(queue, forKey: FishingLabPendingCommandQueueKey)
    defaults.set(queue.first, forKey: FishingLabPendingCommandKey)
    pushApplicationContextIfPossible()
  }

  func consumePendingCommand() -> String? {
    var queue = defaults.stringArray(forKey: FishingLabPendingCommandQueueKey) ?? []
    if !queue.isEmpty {
      let next = queue.removeFirst()
      defaults.set(queue, forKey: FishingLabPendingCommandQueueKey)
      if let nextHead = queue.first {
        defaults.set(nextHead, forKey: FishingLabPendingCommandKey)
      } else {
        defaults.removeObject(forKey: FishingLabPendingCommandKey)
      }
      return next
    }

    let legacy = defaults.string(forKey: FishingLabPendingCommandKey)
    defaults.removeObject(forKey: FishingLabPendingCommandKey)
    return legacy
  }

  func syncActiveOuting(_ serializedOuting: String?) {
    if let serializedOuting, !serializedOuting.isEmpty {
      defaults.set(serializedOuting, forKey: FishingLabActiveOutingKey)
    } else {
      defaults.removeObject(forKey: FishingLabActiveOutingKey)
    }
    pushApplicationContextIfPossible()
  }

  func syncHandsFreePreferences(_ serializedPreferences: String) throws {
    guard !serializedPreferences.isEmpty else {
      defaults.removeObject(forKey: FishingLabHandsFreePreferencesKey)
      pushApplicationContextIfPossible()
      return
    }
    defaults.set(serializedPreferences, forKey: FishingLabHandsFreePreferencesKey)
    pushApplicationContextIfPossible()
  }

  func getWatchCompanionStatus() -> [String: Any] {
    buildStatusPayload().dictionary
  }

  private func buildApplicationContext() -> [String: Any] {
    var context: [String: Any] = [
      "supportedActions": [
        "resume_outing",
        "log_fish",
        "add_note",
        "change_water",
        "change_technique"
      ]
    ]

    if let activeOuting = defaults.string(forKey: FishingLabActiveOutingKey) {
      context["activeOuting"] = activeOuting
    }

    if let preferences = defaults.string(forKey: FishingLabHandsFreePreferencesKey) {
      context["handsFreePreferences"] = preferences
    }

    return context
  }

  private func buildStatusPayload() -> FishingLabWatchCompanionStatusPayload {
    #if canImport(WatchConnectivity)
    guard WCSession.isSupported() else {
      return FishingLabWatchCompanionStatusPayload(
        isSupported: false,
        isPaired: false,
        isWatchAppInstalled: false,
        isReachable: false,
        activationState: "inactive"
      )
    }

    let activeSession = session ?? WCSession.default
    let state: String
    switch activeSession.activationState {
    case .activated:
      state = "activated"
    case .inactive:
      state = "inactive"
    case .notActivated:
      state = "activating"
    @unknown default:
      state = "unknown"
    }

    return FishingLabWatchCompanionStatusPayload(
      isSupported: true,
      isPaired: activeSession.isPaired,
      isWatchAppInstalled: activeSession.isWatchAppInstalled,
      isReachable: activeSession.isReachable,
      activationState: state
    )
    #else
    return FishingLabWatchCompanionStatusPayload(
      isSupported: false,
      isPaired: false,
      isWatchAppInstalled: false,
      isReachable: false,
      activationState: "unknown"
    )
    #endif
  }

  private func activateSessionIfPossible() {
    #if canImport(WatchConnectivity)
    guard WCSession.isSupported() else { return }
    let nextSession = WCSession.default
    nextSession.delegate = self
    nextSession.activate()
    session = nextSession
    #endif
  }

  private func pushApplicationContextIfPossible() {
    #if canImport(WatchConnectivity)
    guard WCSession.isSupported() else { return }
    let activeSession = session ?? WCSession.default
    guard activeSession.activationState == .activated else { return }
    guard activeSession.isPaired && activeSession.isWatchAppInstalled else { return }
    do {
      try activeSession.updateApplicationContext(buildApplicationContext())
    } catch {
      defaults.set(error.localizedDescription, forKey: "fishing_lab.watch_sync_error")
    }
    #endif
  }
}

#if canImport(WatchConnectivity)
extension FishingLabWatchSyncManager: WCSessionDelegate {
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    pushApplicationContextIfPossible()
  }

  func sessionDidBecomeInactive(_ session: WCSession) {}

  func sessionDidDeactivate(_ session: WCSession) {
    session.activate()
  }

  func sessionReachabilityDidChange(_ session: WCSession) {
    pushApplicationContextIfPossible()
  }

  func session(_ session: WCSession, didReceiveMessage message: [String : Any]) {
    handleIncomingPayload(message)
  }

  func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any] = [:]) {
    handleIncomingPayload(userInfo)
  }

  private func handleIncomingPayload(_ payload: [String: Any]) {
    guard let action = payload["action"] as? String, !action.isEmpty else { return }
    var nextPayload = payload
    nextPayload["source"] = "watch"
    try? queuePendingCommand(nextPayload)
  }
}
#endif
