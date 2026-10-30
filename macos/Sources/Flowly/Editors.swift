import SwiftUI
import AppKit
import WebKit
struct NativeNoteView:View {
 @EnvironmentObject var e:NoteEditor
 @EnvironmentObject var w:Workspace
 @State private var source=false
 @State private var confirmReload=false
 var body:some View {
  Group {if e.loading {ProgressView("Opening note…").frame(maxWidth:.infinity,maxHeight:.infinity)}else if let note=e.note {
   VStack(alignment:.leading,spacing:16){
    HStack {Label(e.saving ? "Saving…":e.dirty ? (e.localError == nil ? "Draft saved on this Mac":"Draft not saved locally"):"All changes saved",systemImage:e.saving ? "arrow.triangle.2.circlepath":e.dirty ? "internaldrive":"checkmark.circle").font(.caption).foregroundStyle(.secondary);Spacer();Button("Save"){Task{await e.save()}}.disabled(!e.dirty || e.saving)}
    if let error=e.error {VStack(alignment:.leading,spacing:8){Text(error).font(.callout);HStack{Button("Retry Save"){Task{await e.save()}}.disabled(e.saving);Button("Export Draft"){exportNote(note)};Button("Load Server Version"){confirmReload=true}.disabled(e.saving)}}.padding(12).background(.orange.opacity(0.12),in:RoundedRectangle(cornerRadius:10))}
    if let error=e.localError{Text(error).font(.caption).foregroundStyle(.red)}
    if e.recovery{Text("Recovered a local draft.").font(.caption).foregroundStyle(.tint)}
    TextField("Untitled note",text:Binding(get:{e.note?.title ?? ""},set:{value in e.edit{$0.title=value}})).font(.system(size:28,weight:.semibold)).textFieldStyle(.plain)
    Picker("Project",selection:Binding(get:{e.note?.projectId ?? ""},set:{value in e.edit{$0.projectId=value.isEmpty ? nil:value}})){Text("No project").tag("");ForEach(w.projects){Text($0.name).tag($0.id)}}
    Divider()
    if NoteText.plain(note.content) != nil && !source {
     TextEditor(text:Binding(get:{NoteText.plain(e.note?.content ?? "") ?? ""},set:{value in e.edit{$0.content=NoteText.encode(value)}})).font(.body).scrollContentBackground(.hidden).accessibilityLabel("Note content")
    }else{
     HStack{Text("Rich note").font(.caption).foregroundStyle(.secondary);Spacer();Toggle("Edit HTML source",isOn:$source).toggleStyle(.switch).controlSize(.small)}
     if source{TextEditor(text:Binding(get:{e.note?.content ?? ""},set:{value in e.edit{$0.content=value}})).font(.system(.body,design:.monospaced)).accessibilityLabel("Note HTML source")}else{SafeHTML(html:note.content).clipShape(RoundedRectangle(cornerRadius:8));Text("Formatting is preserved. For visual rich-text editing, open this note in Flowly on the web.").font(.caption).foregroundStyle(.secondary)}
    }
    HStack{Button("Open in Web Editor"){NSWorkspace.shared.open(w.api.base.appendingPathComponent("notes").appending(queryItems:[URLQueryItem(name:"note",value:note.id)]))};Spacer();Button("Export"){exportNote(note)}}.font(.caption)
   }.padding(26)
  }else{EmptyPanel(title:"Couldn’t open note",message:e.error ?? "Choose a note from the list.",icon:"exclamationmark.triangle")}}
  .onChange(of:e.note?.id){_,_ in source=false}
  .confirmationDialog("Replace the local draft with the saved server version? Export the draft first if you need to keep it.",isPresented:$confirmReload){Button("Load Server Version",role:.destructive){Task{await e.loadLatest()}}}
 }
 func exportNote(_ note:Note){let panel=NSSavePanel();panel.nameFieldStringValue="Flowly note.html";panel.canCreateDirectories=true;if panel.runModal() == .OK,let url=panel.url{do{try note.content.write(to:url,atomically:true,encoding:.utf8)}catch{e.error=error.localizedDescription}}}
}
struct SafeHTML:NSViewRepresentable {
 let html:String
 @Environment(\.colorScheme) var scheme
 func makeNSView(context:Context)->WKWebView {let config=WKWebViewConfiguration();config.websiteDataStore = .nonPersistent();config.defaultWebpagePreferences.allowsContentJavaScript=false;let view=WKWebView(frame:.zero,configuration:config);view.navigationDelegate=context.coordinator;view.setValue(false,forKey:"drawsBackground");return view}
 func updateNSView(_ view:WKWebView,context:Context){let key="\(scheme)-\(html)";guard context.coordinator.last != key else{return};context.coordinator.last=key;let dark=scheme == .dark;let style="body{font:15px -apple-system;line-height:1.65;color:\(dark ? "#eee":"#222");overflow-wrap:anywhere}img{max-width:100%}pre{white-space:pre-wrap}a{color:#9b8af8}table{border-collapse:collapse}td,th{border:1px solid #777;padding:6px}";view.loadHTMLString("<html><head><meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; img-src data:; style-src 'unsafe-inline'; frame-src 'none'; form-action 'none'; base-uri 'none'\"><meta name=\"color-scheme\" content=\"\(dark ? "dark":"light")\"><style>\(style)</style></head><body>\(html)</body></html>",baseURL:nil)}
 func makeCoordinator()->Coordinator{Coordinator()}
 final class Coordinator:NSObject,WKNavigationDelegate {var last="";func webView(_ webView:WKWebView,decidePolicyFor action:WKNavigationAction,decisionHandler:@escaping(WKNavigationActionPolicy)->Void){if action.navigationType == .linkActivated{if let url=action.request.url,["http","https"].contains(url.scheme ?? ""){NSWorkspace.shared.open(url)};decisionHandler(.cancel)}else{decisionHandler(action.request.url?.scheme=="about" ? .allow:.cancel)}}}
}
struct TaskDetailView:View {
 @EnvironmentObject var w:Workspace
 let original:FlowTask
 @State private var title=""
 @State private var notes=""
 @State private var status="TODO"
 @State private var priority="MEDIUM"
 @State private var project=""
 @State private var hasDue=false
 @State private var due=Date()
 @State private var saving=false
 @State private var saved=false
 var body:some View {
  Form {
   TextField("Task",text:$title).font(.title2.weight(.semibold))
   Picker("Status",selection:$status){Text("To do").tag("TODO");Text("In progress").tag("DOING");Text("Done").tag("DONE");Text("Canceled").tag("CANCELED")}
   Picker("Priority",selection:$priority){Text("Low").tag("LOW");Text("Medium").tag("MEDIUM");Text("High").tag("HIGH");Text("Urgent").tag("URGENT")}
   Picker("Project",selection:$project){ForEach(w.projects){Text($0.name).tag($0.id)}}
   Toggle("Due date",isOn:$hasDue);if hasDue{DatePicker("Due",selection:$due)}
   SwiftUI.Section("Notes"){TextEditor(text:$notes).frame(minHeight:200).font(.body)}
   HStack{Text(saved ? "Saved":"Changes are saved when you press Save Task.").font(.caption).foregroundStyle(.secondary);Spacer();Button(saving ? "Saving…":"Save Task"){saving=true;saved=false;var task=original;task.title=title;task.notes=notes;task.status=status;task.priority=priority;task.listId=project;task.dueAt=hasDue ? ISO8601DateFormatter().string(from:due):nil;Task{await w.updateTask(task);saving=false;saved=w.error==nil}}.buttonStyle(.borderedProminent).disabled(saving || title.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty)}
  }.formStyle(.grouped).onAppear{title=original.title;notes=original.notes ?? "";status=original.status;priority=original.priority;project=original.listId;hasDue=original.dueDate != nil;due=original.dueDate ?? Date()}
 }
}
struct CaptureView:View {
 @EnvironmentObject var w:Workspace
 @Environment(\.dismiss) var dismiss
 var menuBar=false
 @State private var title=""
 @State private var bodyText=""
 @State private var kind="Task"
 @State private var project=""
 @State private var submitted=false
 var body:some View {
  VStack(alignment:.leading,spacing:16){HStack{Image(systemName:"bolt.fill").foregroundStyle(.tint);Text("Quick capture").font(.title3.bold());Spacer()}
   if w.account==nil{Text("Sign in to the Flowly window to capture tasks and notes.").foregroundStyle(.secondary)}else{
    Picker("Capture",selection:$kind){Text("Task").tag("Task");Text("Note").tag("Note")}.pickerStyle(.segmented)
    TextField(kind=="Task" ? "What’s the next step?":"Note title",text:$title).textFieldStyle(.roundedBorder)
    TextEditor(text:$bodyText).frame(height:100).overlay(alignment:.topLeading){if bodyText.isEmpty{Text("Details (optional)").foregroundStyle(.tertiary).padding(5).allowsHitTesting(false)}}
    Picker("Project",selection:$project){if kind=="Note"{Text("No project").tag("")};ForEach(w.projects){Text($0.name).tag($0.id)}}
    if let error=w.error{Text(error).font(.caption).foregroundStyle(.orange)}
    if submitted{Label("Captured",systemImage:"checkmark.circle.fill").foregroundStyle(.green)}
    HStack{if !menuBar{Button("Cancel"){dismiss()}.keyboardShortcut(.cancelAction)};Spacer();Button(w.busy ? "Saving…":"Add \(kind)"){Task{if await w.capture(title:title,body:bodyText,kind:kind,project:project){title="";bodyText="";submitted=true;if !menuBar{dismiss()}}}}.buttonStyle(.borderedProminent).keyboardShortcut(.defaultAction).disabled(w.busy || title.trimmingCharacters(in:.whitespacesAndNewlines).isEmpty || (kind=="Task" && project.isEmpty))}
   }
  }.onAppear{kind=menuBar ? "Task":w.captureKind;project=w.projectID ?? w.inboxID ?? w.projects.first?.id ?? ""}.onChange(of:title){_,_ in submitted=false}
 }
}
