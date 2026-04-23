import ExpoModulesCore

let FishingLabPendingCommandKey = "fishing_lab.pending_handsfree_command"

public class FishingLabHandsFreeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FishingLabHandsFree")

    AsyncFunction("consumePendingCommand") {
      let defaults = UserDefaults.standard
      let raw = defaults.string(forKey: FishingLabPendingCommandKey)
      defaults.removeObject(forKey: FishingLabPendingCommandKey)
      return raw
    }
  }
}
