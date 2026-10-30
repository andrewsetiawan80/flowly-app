import SwiftUI
import AppKit
@main struct FlowlyApp:App {
 @StateObject private var workspace=Workspace()
 @StateObject private var editor=NoteEditor()
 @AppStorage("appearance") private var appearance="dark"
 var body:some Scene {
  Window("Flowly",id:"workspace") {RootView().environmentObject(workspace).environmentObject(editor).tint(Color(red:0.57,green:0.49,blue:0.94)).preferredColorScheme(appearance=="system" ? nil : appearance=="dark" ? .dark:.light).frame(minWidth:900,minHeight:600).task{await workspace.start()} }
  .defaultSize(width:1200,height:780)
  .commands {
   CommandGroup(after:.newItem) {
    Button("New Task"){workspace.captureKind="Task";workspace.showCapture=true}.keyboardShortcut("n").disabled(workspace.account==nil)
    Button("New Note"){workspace.captureKind="Note";workspace.showCapture=true}.keyboardShortcut("n",modifiers:[.command,.shift]).disabled(workspace.account==nil)
   }
   CommandGroup(replacing:.saveItem){Button("Save Note"){Task{await editor.save()}}.keyboardShortcut("s").disabled(!editor.dirty || editor.saving)}
   CommandMenu("Workspace") {Button("Refresh"){Task{await workspace.refresh()}}.keyboardShortcut("r");Button("Schedule Task Reminders"){Task{await workspace.reminders()}}.disabled(workspace.account==nil);Divider();Button("Open Web App"){NSWorkspace.shared.open(workspace.api.base)}}
  }
  Settings {Form {Picker("Appearance",selection:$appearance){Text("Dark").tag("dark");Text("Light").tag("light");Text("System").tag("system")};Text("Connects to flowly.drivewerkz.com using your local DNS. Your Mac needs access to that server.").font(.callout).foregroundStyle(.secondary);Text("Note drafts are retained on this Mac. Imported rich notes keep their original HTML; use the web editor for full visual formatting.").font(.callout).foregroundStyle(.secondary)}.padding(24).frame(width:430)}
  MenuBarExtra("Flowly",systemImage:"checkmark.square.fill") {CaptureView(menuBar:true).environmentObject(workspace).frame(width:340).padding(18)}.menuBarExtraStyle(.window)
 }
}
struct RootView:View {
 @EnvironmentObject var w:Workspace
 @EnvironmentObject var editor:NoteEditor
 var body:some View {
  Group {if w.connecting {ProgressView("Connecting to Flowly…").frame(maxWidth:.infinity,maxHeight:.infinity)} else if w.account==nil {SignInView()} else {WorkspaceView()}}
   .sheet(isPresented:$w.showCapture){CaptureView().padding(24).frame(width:450).environmentObject(w)}
   .onChange(of:w.account?.email){_,_ in editor.clear()}
 }
}
struct SignInView:View {
 @EnvironmentObject var w:Workspace
 @State private var email=""
 @State private var password=""
 var body:some View {
  VStack(spacing:22) {
   Image(systemName:"checkmark.square.fill").font(.system(size:66)).foregroundStyle(.tint)
   VStack(spacing:8){Text("Welcome to Flowly").font(.largeTitle.bold());Text("Your ideas and next steps, together.").foregroundStyle(.secondary)}
   VStack(spacing:12){TextField("Email",text:$email).textContentType(.username);SecureField("Password",text:$password).textContentType(.password)}.textFieldStyle(.roundedBorder)
   if let error=w.error {Text(error).font(.callout).foregroundStyle(.orange).textSelection(.enabled)}
   Button {let pass=password;password="";Task{await w.login(email,pass)}} label:{HStack{if w.busy{ProgressView().controlSize(.small)};Text("Sign In").frame(maxWidth:.infinity)}}.buttonStyle(.borderedProminent).controlSize(.large).keyboardShortcut(.defaultAction).disabled(w.busy || email.isEmpty || password.isEmpty)
   Text("Use your Flowly account. Your password is never stored; the session is kept in macOS Keychain.").font(.caption).foregroundStyle(.secondary).multilineTextAlignment(.center)
   HStack{Button("Retry Connection"){w.error=nil;Task{await w.start()}};Button("Preview Interface"){w.preview()}}.buttonStyle(.link)
   Text("flowly.drivewerkz.com · Local network or VPN required").font(.caption2).foregroundStyle(.tertiary)
  }.frame(width:350).padding(50).frame(maxWidth:.infinity,maxHeight:.infinity)
 }
}
struct WorkspaceView:View {
 @EnvironmentObject var w:Workspace
 @EnvironmentObject var editor:NoteEditor
 var body:some View {
  NavigationSplitView {
   VStack(alignment:.leading,spacing:0) {
    HStack{Image(systemName:"checkmark.square.fill").foregroundStyle(.tint);Text("flowly.").font(.title2.bold())}.padding(20)
    List(selection:$w.section){ForEach(Section.allCases){s in Label(s.rawValue,systemImage:s.icon).tag(s)}
     SwiftUI.Section("Your projects"){ForEach(w.projects){p in Button{w.section = .projects;w.projectID=p.id;w.selection=nil}label:{Label(p.name,systemImage:"folder").foregroundStyle(w.projectID==p.id && w.section == .projects ? Color.accentColor:Color.primary)}.buttonStyle(.plain)}}
    }.listStyle(.sidebar)
    VStack(alignment:.leading,spacing:10){Text(w.account?.name ?? w.account?.email ?? "").font(.caption).foregroundStyle(.secondary);HStack{SettingsLink{Image(systemName:"gearshape")};Spacer();Button("Sign out"){editor.clear();w.logout()}.buttonStyle(.plain).font(.caption)}}.padding(18)
   }.navigationSplitViewColumnWidth(min:190,ideal:220,max:280)
  } content: {
   VStack(spacing:0) {
    if w.section == .projects {Picker("Project",selection:$w.projectID){Text("Choose a project").tag(Optional<String>.none);ForEach(w.projects){Text($0.name).tag(Optional($0.id))}}.padding();if w.projectID != nil{Picker("Project content",selection:$w.projectTab){Text("Tasks").tag("Tasks");Text("Notes").tag("Notes")}.pickerStyle(.segmented).padding(.horizontal).padding(.bottom,8)}}
    TextField("Search \(w.showingNotes ? "notes":"tasks")",text:$w.query).textFieldStyle(.roundedBorder).padding([.horizontal,.bottom])
    if w.showingNotes {
     List(selection:$w.selection){ForEach(w.filteredNotes){n in VStack(alignment:.leading,spacing:6){HStack{Text(n.title).font(.headline).lineLimit(2);if n.isStarred{Image(systemName:"star.fill").font(.caption).foregroundStyle(.yellow)}};Text(n.preview ?? "").font(.caption).foregroundStyle(.secondary).lineLimit(2)}.padding(.vertical,7).tag(n.id)}}.overlay {if w.filteredNotes.isEmpty{EmptyPanel(title:"A place for your next idea",message:"Create a note from the + button.",icon:"note.text")}}
    } else {
     List(selection:$w.selection){ForEach(w.filteredTasks){t in HStack(alignment:.top,spacing:10){Button{var updated=t;updated.status=t.done ? "TODO":"DONE";Task{await w.updateTask(updated)}}label:{Image(systemName:t.done ? "checkmark.circle.fill":"circle").font(.title3).foregroundStyle(t.done ? Color.accentColor:Color.secondary)}.buttonStyle(.plain);VStack(alignment:.leading,spacing:6){Text(t.title).font(.headline).strikethrough(t.done).lineLimit(3);if let date=t.dueDate{Text(date,style:.date).font(.caption).foregroundStyle(date<Date() && !t.done ? Color.orange:Color.secondary)}}}.padding(.vertical,7).tag(t.id)}}.overlay{if w.filteredTasks.isEmpty{EmptyPanel(title:w.section == .today ? "Room to focus":"No tasks here",message:w.section == .today ? "Tasks due today and overdue appear here.":"Choose a project or add your next step.",icon:w.section.icon)}}
    }
    HStack{if w.busy{ProgressView().controlSize(.mini)};Text(w.lastSync.map{"Synced "+$0.formatted(date:.omitted,time:.shortened)} ?? "Not synced").font(.caption2).foregroundStyle(.secondary);Spacer()}.padding(12)
   }.navigationTitle(w.section.rawValue).navigationSplitViewColumnWidth(min:260,ideal:320,max:440)
  } detail: {
   VStack(spacing:0){if w.previewMode{HStack{Text("Preview · sample data").font(.caption);Spacer();Button("Exit Preview"){w.logout()}}.padding(12).background(.purple.opacity(0.15))};if let error=w.error {HStack{Image(systemName:"exclamationmark.circle");Text(error).font(.callout).textSelection(.enabled);Spacer();Button("Retry"){Task{await w.refresh()}};Button{w.error=nil}label:{Image(systemName:"xmark")}}.padding(12).background(.orange.opacity(0.12))}
    if w.showingNotes,let id=w.selection {NativeNoteView().disabled(w.previewMode).task(id:id){if w.previewMode{editor.showPreview()}else if let account=w.account{await editor.open(id:id,account:account.email,api:w.api)}}}
    else if let id=w.selection,let t=w.tasks.first(where:{$0.id==id}) {TaskDetailView(original:t).disabled(w.previewMode).id(t.id)}
    else{EmptyPanel(title:w.showingNotes ? "Make space for an idea":"One next step",message:"Select an item to open it, or press ⌘N to capture a task.",icon:w.showingNotes ? "square.and.pencil":"checkmark.circle")}
   }.frame(maxWidth:.infinity,maxHeight:.infinity)
  }
  .toolbar {ToolbarItemGroup{Button{Task{await w.refresh()}}label:{Image(systemName:"arrow.clockwise")}.help("Refresh · ⌘R");Menu{Button("New Task"){w.captureKind="Task";w.showCapture=true};Button("New Note"){w.captureKind="Note";w.showCapture=true}}label:{Image(systemName:"plus")}}}
  .onChange(of:w.section){_,_ in w.selection=nil;w.query=""}
  .onChange(of:w.projectID){_,_ in w.selection=nil}
  .onChange(of:w.projectTab){_,_ in w.selection=nil}
 }
}
struct EmptyPanel:View {var title:String;var message:String;var icon:String;var body:some View{VStack(spacing:12){Image(systemName:icon).font(.system(size:36,weight:.light)).foregroundStyle(.tint);Text(title).font(.title3.weight(.semibold));Text(message).font(.callout).foregroundStyle(.secondary).multilineTextAlignment(.center)}.padding(30).frame(maxWidth:.infinity,maxHeight:.infinity)}}
