import SwiftUI

struct FishingLabWatchContentView: View {
  @StateObject private var connectivity = FishingLabWatchConnectivity()
  @State private var noteText = ""

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 12) {
        Text("Fishing Lab")
          .font(.headline)

        if let outing = connectivity.activeOuting {
          Text("Active outing")
            .font(.caption)
            .foregroundStyle(.secondary)
          Text("\(outing.targetRoute) session #\(outing.sessionId)")
            .font(.body.weight(.semibold))
          Text("Last active \(outing.lastActiveAt)")
            .font(.caption2)
            .foregroundStyle(.secondary)
        } else {
          Text("Open Fishing Lab on iPhone to sync the current outing.")
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        Button("Resume Outing") {
          connectivity.resumeOuting()
        }

        Button("Log Fish") {
          connectivity.logFish()
        }

        TextField("Quick note", text: $noteText)
        Button("Add Note") {
          let trimmed = noteText.trimmingCharacters(in: .whitespacesAndNewlines)
          guard !trimmed.isEmpty else { return }
          connectivity.addNote(trimmed)
          noteText = ""
        }

        Button("Change Water to riffle") {
          connectivity.changeWater("riffle")
        }

        Button("Change Technique to Euro Nymphing") {
          connectivity.changeTechnique("Euro Nymphing")
        }

        Text(connectivity.lastStatusMessage)
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
      .padding()
    }
  }
}
