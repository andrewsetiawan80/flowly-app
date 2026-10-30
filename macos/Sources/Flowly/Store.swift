import SwiftUI
import CryptoKit
import UserNotifications
@MainActor final class Workspace: ObservableObject {
 let api: API
 @Published var previewMode=false
 @Published var account: Account?
 @Published var connecting=true
 @Published var busy=false
 @Published var error: String?
 @Published var tasks=[FlowTask]()
 @Published var projects=[Project]()
 @Published var notes=[NoteSummary]()
 @Published var section: Section = .today
 @Published var projectID: String?
 @Published var selection: String?
 @Published var query=""
 @Published var projectTab="Tasks"
 @Published var showCapture=false
 @Published var captureKind="Task"
 @Published var lastSync: Date?
 init(api: API? = nil) { self.api=api ?? API() }
 func start() async { defer{connecting=false};do{account=try await api.account();if account != nil{await refresh()}}catch{self.error="Cannot reach Flowly: \(error.localizedDescription) Connect to your home network or VPN, then retry."} }
 func login(_ email:String,_ password:String) async {busy=true;defer{busy=false};do{account=try await api.signIn(email:email,password:password);error=nil;await refresh()}catch{self.error=error.localizedDescription} }
 func refresh() async {
  guard account != nil,!previewMode else{return};busy=true;defer{busy=false}
  do{async let p:ProjectsReply=api.request("/api/lists");async let n:NotesReply=api.request("/api/notes");async let t=api.tasks();let values=try await(p,n,t);projects=values.0.lists;notes=values.1.notes;tasks=values.2;lastSync=Date();error=nil}catch{handle(error)}
 }
 func preview() {
  previewMode=true;account=Account(email:"preview@flowly.local",name:"Preview workspace");error=nil;connecting=false;section = .inbox;selection=nil
  projects=[Project(id:"preview-inbox",name:"Inbox"),Project(id:"preview-home",name:"Home studio"),Project(id:"preview-launch",name:"Flowly launch")]
  tasks=[FlowTask(id:"preview-task1",title:"Plan the week ahead",notes:"Choose three things that matter this week. Keep the rest in your inbox.",status:"TODO",priority:"HIGH",dueAt:ISO8601DateFormatter().string(from:Date()),listId:"preview-inbox"),FlowTask(id:"preview-task2",title:"Collect ideas for the home studio",notes:"Lighting, desk layout, and a quiet place to think.",status:"DOING",priority:"MEDIUM",listId:"preview-inbox"),FlowTask(id:"preview-task3",title:"Try the native Flowly workspace",notes:"A familiar place for your tasks, notes, and plans.",status:"DONE",priority:"LOW",listId:"preview-inbox")]
  notes=[NoteSummary(id:"preview-note",title:"A little room to think",preview:"Good ideas need somewhere to land. Capture them here, then connect them to a project.",isArchived:false,isStarred:true,updatedAt:ISO8601DateFormatter().string(from:Date()))]
 }

 func handle(_ error:Error) { self.error=error.localizedDescription;if (error as? APIError)?.status==401 {account=nil} }
 func logout(){previewMode=false;api.signOut();account=nil;tasks=[];notes=[];projects=[];selection=nil;error=nil}
 var inboxID:String? {projects.first{$0.name.lowercased()=="inbox"}?.id}
 var showingNotes:Bool {section == .notes || (section == .projects && projectID != nil && projectTab == "Notes")}
 var filteredTasks:[FlowTask] { tasks.filter { task in
  let scope:Bool
  switch section {case .today:scope = !task.done && (task.dueDate.map{ $0 < Calendar.current.startOfDay(for:Date().addingTimeInterval(86400)) } ?? false)
  case .inbox:scope=task.listId==inboxID
  case .projects:scope=task.listId==projectID
  case .notes:scope=false}
  return scope && (query.isEmpty || task.title.localizedCaseInsensitiveContains(query))
 }.sorted{if $0.done != $1.done{return !$0.done};return ($0.dueDate ?? .distantFuture)<($1.dueDate ?? .distantFuture)} }
 var filteredNotes:[NoteSummary] {notes.filter{!$0.isArchived && (section != .projects || $0.projectId==projectID) && (query.isEmpty || $0.title.localizedCaseInsensitiveContains(query) || ($0.preview?.localizedCaseInsensitiveContains(query) ?? false))} }
 func updateTask(_ task:FlowTask) async {guard !previewMode else{return};do{let _:TaskReply=try await api.request("/api/tasks",method:"PATCH",body:["id":task.id,"title":task.title,"notes":task.notes ?? "","status":task.status,"priority":task.priority,"dueAt":task.dueAt as Any? ?? NSNull(),"listId":task.listId]);await refresh()}catch{handle(error)} }
 func capture(title:String,body:String,kind:String,project:String) async -> Bool {
  guard !previewMode else{return false}
  guard !title.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty else{return false}
  busy=true;defer{busy=false}
  do{if kind=="Note"{let _:Note=try await api.request("/api/notes",method:"POST",body:["title":title,"content":NoteText.encode(body),"projectId":project.isEmpty ? NSNull() : project as Any])}else{guard !project.isEmpty else{throw APIError(status:0,message:"Choose a project for your task.")};let _:TaskReply=try await api.request("/api/tasks",method:"POST",body:["title":title,"notes":body,"listId":project,"priority":"MEDIUM"])};await refresh();return true}catch{handle(error);return false}
 }
 func reminders() async {guard !previewMode else{return};do{let center=UNUserNotificationCenter.current();guard try await center.requestAuthorization(options:[.alert,.sound,.badge])else{error="Notifications are disabled. You can enable them in System Settings.";return};center.removeAllPendingNotificationRequests();for task in tasks where !task.done {guard let due=task.dueDate,due>Date() else{continue};let content=UNMutableNotificationContent();content.title="Flowly reminder";content.body=task.title;content.sound = .default;let trigger=UNTimeIntervalNotificationTrigger(timeInterval:max(1,due.timeIntervalSinceNow),repeats:false);try await center.add(UNNotificationRequest(identifier:task.id,content:content,trigger:trigger))};error="Reminders scheduled for currently loaded tasks with future due dates."}catch{self.error=error.localizedDescription} }
}
struct DraftDisk {
 let root: URL
 init(account:String,base:URL?=nil) throws {
  let home=base ?? FileManager.default.urls(for:.applicationSupportDirectory,in:.userDomainMask)[0].appendingPathComponent("Flowly/Drafts",isDirectory:true)
  let hash=SHA256.hash(data:Data(account.lowercased().utf8)).map{String(format:"%02x",$0)}.joined();root=home.appendingPathComponent(hash,isDirectory:true)
  try FileManager.default.createDirectory(at:root,withIntermediateDirectories:true,attributes:[.posixPermissions:0o700])
 }
 func url(_ id:String)->URL {root.appendingPathComponent(SHA256.hash(data:Data(id.utf8)).map{String(format:"%02x",$0)}.joined()+".json")}
 func read(_ id:String)throws->LocalDraft? {let file=url(id);guard FileManager.default.fileExists(atPath:file.path)else{return nil};return try JSONDecoder().decode(LocalDraft.self,from:Data(contentsOf:file))}
 func write(_ note:Note)throws {let file=url(note.id);try JSONEncoder().encode(LocalDraft(note:note,savedAt:Date())).write(to:file,options:.atomic);try FileManager.default.setAttributes([.posixPermissions:0o600],ofItemAtPath:file.path)}
 func remove(_ id:String)throws {let file=url(id);if FileManager.default.fileExists(atPath:file.path){try FileManager.default.removeItem(at:file)}}
}
@MainActor final class NoteEditor:ObservableObject {
 @Published var note:Note?
 @Published var dirty=false
 @Published var saving=false
 @Published var loading=false
 @Published var error:String?
 @Published var recovery=false
 @Published var localError:String?
 private let draftBase:URL?
 init(draftBase:URL?=nil){self.draftBase=draftBase}
 private var disk:DraftDisk?
 private var api:API?
 private var generation=0
 private var change=0
 private var timer:Task<Void,Never>?
 func open(id:String,account:String,api:API) async {
  generation += 1;let token=generation;timer?.cancel();note=nil;dirty=false;error=nil;recovery=false;loading=true;self.api=api
  do{disk=try DraftDisk(account:account,base:draftBase);let server:Note=try await api.request("/api/notes/\(id)");guard token==generation else{return};if let draft=try disk?.read(id){note=draft.note;dirty=true;recovery=true;if draft.note.version != server.version{error="A newer version exists on the server. Export your local draft before loading that version."}else{schedule()}}else{note=server}}catch{guard token==generation else{return};if let draft=try? disk?.read(id){note=draft.note;dirty=true;recovery=true};self.error=error.localizedDescription};if token==generation{loading=false}
 }
 func edit(_ update:(inout Note)->Void) {guard var n=note else{return};update(&n);note=n;change += 1;dirty=true;persist();if error==nil{schedule()} }
 func persist(){guard let note else{return};do{try disk?.write(note);localError=nil}catch{localError="Local draft could not be saved: \(error.localizedDescription)"} }
 func schedule(){timer?.cancel();timer=Task{try? await Task.sleep(for:.milliseconds(900));guard !Task.isCancelled else{return};await save()} }
 func save() async {
  guard dirty,!saving,let sent=note,let api else{return};saving=true;let revision=change;let token=generation;let targetDisk=disk
  do{let saved:Note=try await api.request("/api/notes/\(sent.id)",method:"PATCH",body:["title":sent.title.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty ? "Untitled note":sent.title,"content":sent.content,"projectId":sent.projectId as Any? ?? NSNull(),"version":sent.version]);if token==generation{error=nil;if change==revision{note=saved;dirty=false;recovery=false;try targetDisk?.remove(sent.id)}else{note?.version=saved.version;persist()}}else{if var retained=try targetDisk?.read(sent.id),retained.note != sent {retained.note.version=saved.version;try targetDisk?.write(retained.note)}else{try targetDisk?.remove(sent.id)}}}catch{if token==generation{self.error=error.localizedDescription}};saving=false;if dirty,error==nil{schedule()}
 }
 func loadLatest() async {guard let n=note,let api else{return};timer?.cancel();loading=true;defer{loading=false};do{let latest:Note=try await api.request("/api/notes/\(n.id)");try disk?.remove(n.id);note=latest;dirty=false;error=nil;recovery=false;change += 1}catch{self.error=error.localizedDescription}}
 func showPreview(){clear();note=Note(id:"preview-note",title:"A little room to think",content:NoteText.encode("Good ideas need somewhere to land.\n\nCapture them here, then connect them to a project.\n\nThis is a read-only preview using sample data."),version:1)}
 func clear(){generation += 1;timer?.cancel();note=nil;dirty=false;error=nil;disk=nil}
}
