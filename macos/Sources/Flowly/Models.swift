import Foundation
struct Account: Codable { let email: String; let name: String? }
struct SessionReply: Decodable { let user: Account? }
struct CSRF: Decodable { let csrfToken: String }
struct Project: Codable, Identifiable, Hashable { let id: String; var name: String; var description: String?; var parentId: String? }
struct ProjectsReply: Decodable { let lists: [Project] }
struct FlowTask: Codable, Identifiable, Hashable {
 let id: String; var title: String; var notes: String?; var status: String; var priority: String; var dueAt: String?; var listId: String
 var done: Bool { status == "DONE" || status == "CANCELED" }
 var dueDate: Date? { dueAt.flatMap(Self.date) }
 static func date(_ text: String) -> Date? { let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime,.withFractionalSeconds]; return f.date(from:text) ?? ISO8601DateFormatter().date(from:text) }
}
struct TasksReply: Decodable { let tasks: [FlowTask]; let nextCursor: String? }
struct TaskReply: Decodable { let task: FlowTask }
struct NoteSummary: Codable, Identifiable, Hashable { let id: String; var title: String; var preview: String?; var projectId: String?; var isArchived: Bool; var isStarred: Bool; var updatedAt: String }
struct NotesReply: Decodable { let notes: [NoteSummary] }
struct Note: Codable, Identifiable, Equatable { let id: String; var title: String; var content: String; var version: Int; var projectId: String? }
struct LocalDraft: Codable { var note: Note; var savedAt: Date }
struct APIError: LocalizedError { let status: Int; let message: String; var errorDescription: String? { message } }
enum Section: String, CaseIterable, Identifiable {
 case today = "Today", inbox = "Inbox", projects = "Projects", notes = "Notes"
 var id: String { rawValue }
 var icon: String { switch self { case .today: "sun.max"; case .inbox: "tray"; case .projects: "folder"; case .notes: "note.text" } }
}
enum NoteText {
 static func encode(_ text: String) -> String { "<p>" + text.replacingOccurrences(of:"&",with:"&amp;").replacingOccurrences(of:"<",with:"&lt;").replacingOccurrences(of:">",with:"&gt;").replacingOccurrences(of:"\n",with:"<br>") + "</p>" }
 // Only our exact plain-text encoding is editable as plain text. Imported HTML stays lossless in source mode.
 static func plain(_ html: String) -> String? {
  guard html.hasPrefix("<p>"),html.hasSuffix("</p>") else { return html.isEmpty ? "" : nil }
  let inner = String(html.dropFirst(3).dropLast(4)).replacingOccurrences(of:"<br>",with:"\n")
  guard !inner.contains("<") else { return nil }
  return inner.replacingOccurrences(of:"&lt;",with:"<").replacingOccurrences(of:"&gt;",with:">").replacingOccurrences(of:"&amp;",with:"&")
 }
 static func preview(_ html: String) -> String { html.replacingOccurrences(of:"<[^>]+>",with:" ",options:.regularExpression).replacingOccurrences(of:"&nbsp;",with:" ").replacingOccurrences(of:"&lt;",with:"<").replacingOccurrences(of:"&gt;",with:">").replacingOccurrences(of:"&amp;",with:"&") }
}
