import AppIntents
import Foundation

@available(iOS 16.0, *)
private enum FishingLabHandsFreeAction: String {
  case logFish = "log_fish"
  case addNote = "add_note"
  case changeWater = "change_water"
  case changeTechnique = "change_technique"
  case resumeOuting = "resume_outing"
}

@available(iOS 16.0, *)
private enum FishingLabSpecies: String, AppEnum {
  case brook = "Brook"
  case brown = "Brown"
  case cutthroat = "Cutthroat"
  case rainbow = "Rainbow"
  case tiger = "Tiger"
  case whitefish = "Whitefish"

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Species"
  static var caseDisplayRepresentations: [FishingLabSpecies: DisplayRepresentation] = [
    .brook: "Brook",
    .brown: "Brown",
    .cutthroat: "Cutthroat",
    .rainbow: "Rainbow",
    .tiger: "Tiger",
    .whitefish: "Whitefish"
  ]
}

@available(iOS 16.0, *)
private enum FishingLabWaterType: String, AppEnum {
  case glide = "glide"
  case pocketWater = "pocket water"
  case pool = "pool"
  case riffle = "riffle"
  case run = "run"

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Water Type"
  static var caseDisplayRepresentations: [FishingLabWaterType: DisplayRepresentation] = [
    .glide: "glide",
    .pocketWater: "pocket water",
    .pool: "pool",
    .riffle: "riffle",
    .run: "run"
  ]
}

@available(iOS 16.0, *)
private enum FishingLabTechnique: String, AppEnum {
  case dryFly = "Dry Fly"
  case dryDropper = "Dry Dropper"
  case euroNymphing = "Euro Nymphing"

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Technique"
  static var caseDisplayRepresentations: [FishingLabTechnique: DisplayRepresentation] = [
    .dryFly: "Dry Fly",
    .dryDropper: "Dry Dropper",
    .euroNymphing: "Euro Nymphing"
  ]
}

@available(iOS 16.0, *)
private enum FishingLabLengthUnit: String, AppEnum {
  case inches = "in"
  case millimeters = "mm"
  case centimeters = "cm"

  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Length Unit"
  static var caseDisplayRepresentations: [FishingLabLengthUnit: DisplayRepresentation] = [
    .inches: "inches",
    .millimeters: "millimeters",
    .centimeters: "centimeters"
  ]
}

@available(iOS 16.0, *)
struct LogFishIntent: AppIntent {
  static let title: LocalizedStringResource = "Log Fish"
  static let description = IntentDescription("Open Fishing Lab and log a fish to the current outing.")
  static let openAppWhenRun = true

  @Parameter(title: "Species")
  var species: FishingLabSpecies?

  @Parameter(title: "Length")
  var lengthValue: Double?

  @Parameter(title: "Length Unit")
  var lengthUnit: FishingLabLengthUnit?

  func perform() async throws -> some IntentResult & ProvidesDialog {
    try FishingLabWatchSyncManager.shared.queuePendingCommand([
      "action": FishingLabHandsFreeAction.logFish.rawValue,
      "source": "siri",
      "species": species?.rawValue as Any,
      "lengthValue": lengthValue as Any,
      "lengthUnit": lengthUnit?.rawValue as Any
    ])
    return .result(dialog: "Opening Fishing Lab to log your fish.")
  }
}

@available(iOS 16.0, *)
struct AddOutingNoteIntent: AppIntent {
  static let title: LocalizedStringResource = "Add Note"
  static let description = IntentDescription("Open Fishing Lab and attach a short note to the current outing.")
  static let openAppWhenRun = true

  @Parameter(title: "Note")
  var noteText: String

  func perform() async throws -> some IntentResult & ProvidesDialog {
    try FishingLabWatchSyncManager.shared.queuePendingCommand([
      "action": FishingLabHandsFreeAction.addNote.rawValue,
      "source": "siri",
      "noteText": noteText
    ])
    return .result(dialog: "Opening Fishing Lab to save your note.")
  }
}

@available(iOS 16.0, *)
struct ChangeWaterIntent: AppIntent {
  static let title: LocalizedStringResource = "Change Water"
  static let description = IntentDescription("Open Fishing Lab and update the current outing water type.")
  static let openAppWhenRun = true

  @Parameter(title: "Water Type")
  var waterType: FishingLabWaterType

  func perform() async throws -> some IntentResult & ProvidesDialog {
    try FishingLabWatchSyncManager.shared.queuePendingCommand([
      "action": FishingLabHandsFreeAction.changeWater.rawValue,
      "source": "siri",
      "waterType": waterType.rawValue
    ])
    return .result(dialog: "Opening Fishing Lab to change water.")
  }
}

@available(iOS 16.0, *)
struct ChangeTechniqueIntent: AppIntent {
  static let title: LocalizedStringResource = "Change Technique"
  static let description = IntentDescription("Open Fishing Lab and update the technique for the current outing.")
  static let openAppWhenRun = true

  @Parameter(title: "Technique")
  var technique: FishingLabTechnique

  func perform() async throws -> some IntentResult & ProvidesDialog {
    try FishingLabWatchSyncManager.shared.queuePendingCommand([
      "action": FishingLabHandsFreeAction.changeTechnique.rawValue,
      "source": "siri",
      "technique": technique.rawValue
    ])
    return .result(dialog: "Opening Fishing Lab to change technique.")
  }
}

@available(iOS 16.0, *)
struct ResumeCurrentOutingIntent: AppIntent {
  static let title: LocalizedStringResource = "Resume Current Outing"
  static let description = IntentDescription("Open Fishing Lab and jump back into the current outing.")
  static let openAppWhenRun = true

  func perform() async throws -> some IntentResult & ProvidesDialog {
    try FishingLabWatchSyncManager.shared.queuePendingCommand([
      "action": FishingLabHandsFreeAction.resumeOuting.rawValue,
      "source": "siri"
    ])
    return .result(dialog: "Opening Fishing Lab to resume your outing.")
  }
}

@available(iOS 16.0, *)
struct FishingLabAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: LogFishIntent(),
      phrases: [
        "Log fish in \(.applicationName)",
        "Log a fish with \(.applicationName)"
      ],
      shortTitle: "Log Fish",
      systemImageName: "fish"
    )

    AppShortcut(
      intent: AddOutingNoteIntent(),
      phrases: [
        "Add note in \(.applicationName)",
        "Save a note with \(.applicationName)"
      ],
      shortTitle: "Add Note",
      systemImageName: "note.text"
    )

    AppShortcut(
      intent: ChangeWaterIntent(),
      phrases: [
        "Change water in \(.applicationName)",
        "Update water type with \(.applicationName)"
      ],
      shortTitle: "Change Water",
      systemImageName: "water.waves"
    )

    AppShortcut(
      intent: ChangeTechniqueIntent(),
      phrases: [
        "Change technique in \(.applicationName)",
        "Update technique with \(.applicationName)"
      ],
      shortTitle: "Change Technique",
      systemImageName: "figure.fly"
    )

    AppShortcut(
      intent: ResumeCurrentOutingIntent(),
      phrases: [
        "Resume current outing in \(.applicationName)",
        "Open my outing in \(.applicationName)"
      ],
      shortTitle: "Resume Outing",
      systemImageName: "arrow.clockwise.circle"
    )
  }
}
