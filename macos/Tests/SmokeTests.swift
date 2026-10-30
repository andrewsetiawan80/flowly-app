import Foundation
func check(_ value:Bool,_ message:String)throws {if !value{throw APIError(status:0,message:"FAIL: "+message)}}
final class MockProtocol:URLProtocol {
 static var response=""
 static var status=200
 static var delay:TimeInterval=0
 override class func canInit(with request:URLRequest)->Bool{true}
 override class func canonicalRequest(for request:URLRequest)->URLRequest{request}
 override func startLoading(){let data=Data(Self.response.utf8);let code=Self.status;DispatchQueue.global().asyncAfter(deadline:.now()+Self.delay){self.client?.urlProtocol(self,didReceive:HTTPURLResponse(url:self.request.url!,statusCode:code,httpVersion:nil,headerFields:["Content-Type":"application/json"])!,cacheStoragePolicy:.notAllowed);self.client?.urlProtocol(self,didLoad:data);self.client?.urlProtocolDidFinishLoading(self)}}
 override func stopLoading(){}
}
@main enum SmokeTests {
 @MainActor static func main()async {
  do {
   let text="A & B <tag>\nSecond line > first";try check(NoteText.plain(NoteText.encode(text))==text,"plain note round trip");try check(NoteText.plain("<p><strong>Important</strong></p>")==nil,"rich HTML protection")
   let root=FileManager.default.temporaryDirectory.appendingPathComponent(UUID().uuidString);defer{try? FileManager.default.removeItem(at:root)}
   let disk=try DraftDisk(account:"a@example.test",base:root),other=try DraftDisk(account:"b@example.test",base:root)
   let n=Note(id:"../untrusted",title:"Draft",content:"<p>Keep me</p>",version:4,projectId:nil);try disk.write(n);try check(try disk.read(n.id)?.note==n,"draft recovery");try check(try other.read(n.id)==nil,"account isolation");try check((try FileManager.default.attributesOfItem(atPath:disk.url(n.id).path)[.posixPermissions] as? Int)==0o600,"private draft permissions")
   let config=URLSessionConfiguration.ephemeral;config.protocolClasses=[MockProtocol.self];let mockAPI=API(base:URL(string:"https://fixture.invalid")!,persistSession:false,configuration:config)
   let editor=NoteEditor(draftBase:root)
   let server=Note(id:"note1",title:"Original",content:"<p>Original</p>",version:1,projectId:nil)
   MockProtocol.response=String(data:try JSONEncoder().encode(server),encoding:.utf8)!
   await editor.open(id:server.id,account:"writer@example.test",api:mockAPI)
   editor.edit{$0.title="First edit"}
   var response=server;response.title="First edit";response.version=2
   MockProtocol.response=String(data:try JSONEncoder().encode(response),encoding:.utf8)!;MockProtocol.delay=0.15
   let save=Task{await editor.save()};try await Task.sleep(for:.milliseconds(30));editor.edit{$0.content="<p>New typing while save runs</p>"};await save.value
   try check(editor.note?.content=="<p>New typing while save runs</p>" && editor.note?.version==2 && editor.dirty,"in-flight edits preserved")
   MockProtocol.status=409;MockProtocol.delay=0;await editor.save();try check(editor.error != nil && editor.dirty,"conflict retains draft")
   let savedDraft=try DraftDisk(account:"writer@example.test",base:root).read(server.id);try check(savedDraft?.note.content==editor.note?.content,"conflicted draft persisted")
   editor.clear()
   print("PASS: note encoding, rich-note protection, account isolation, private draft permissions, in-flight edits and conflict recovery")
   if ProcessInfo.processInfo.environment["FLOWLY_LIVE_READ_ONLY"]=="1" { let api=API(persistSession:false);_ = try await api.account();print("PASS: live macOS URLSession connectivity") }
   if ProcessInfo.processInfo.environment["FLOWLY_LOCAL_API_TEST"]=="1" {
    let api=API(base:URL(string:"http://localhost:3100")!,persistSession:false);let account=try await api.signIn(email:"demo@example.com",password:"demo123");try check(account.email=="demo@example.com","native cookie sign-in")
    let projects:ProjectsReply=try await api.request("/api/lists");try check(!projects.lists.isEmpty,"projects decoding");let tasks=try await api.tasks();try check(!tasks.isEmpty,"tasks decoding")
    let created:Note=try await api.request("/api/notes",method:"POST",body:["title":"Native Swift integration fixture","content":NoteText.encode("Native draft")])
    let saved:Note=try await api.request("/api/notes/\(created.id)",method:"PATCH",body:["version":created.version,"content":NoteText.encode("Saved from Swift")]);try check(saved.version==created.version+1,"native note save")
    do{let _:Note=try await api.request("/api/notes/\(created.id)",method:"PATCH",body:["version":created.version,"content":"stale"]);throw APIError(status:0,message:"stale save accepted")}catch{try check((error as? APIError)?.status==409,"API rejects stale saves")}
    let _:Note=try await api.request("/api/notes/\(created.id)",method:"PATCH",body:["version":saved.version,"isArchived":true]);api.signOut();let signedOut=try await api.account();try check(signedOut==nil,"sign-out clears session")
    print("PASS: native sign-in, authenticated tasks/projects, note creation, save, stale-version conflict and sign-out against isolated API")
   }
  }catch{if case let DecodingError.keyNotFound(key, context)=error {print("Missing API field: \(key.stringValue) at \(context.codingPath.map(\.stringValue))")};print(error.localizedDescription);exit(1)}
 }
}
