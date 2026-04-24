import ExpoModulesCore

public class FishingLabHandsFreeModule: Module {
  public func definition() -> ModuleDefinition {
    Name("FishingLabHandsFree")

    let syncManager = FishingLabWatchSyncManager.shared

    AsyncFunction("consumePendingCommand") {
      syncManager.consumePendingCommand()
    }

    AsyncFunction("syncActiveOuting") { (serializedOuting: String?) in
      syncManager.syncActiveOuting(serializedOuting)
    }

    AsyncFunction("syncHandsFreePreferences") { (serializedPreferences: String) throws in
      try syncManager.syncHandsFreePreferences(serializedPreferences)
    }

    AsyncFunction("getWatchCompanionStatus") {
      syncManager.getWatchCompanionStatus()
    }
  }
}
