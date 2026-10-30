import Foundation
import Security
final class SameOrigin: NSObject, URLSessionTaskDelegate {
 let origin: URL
 init(origin: URL) { self.origin = origin }
 func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(request.url?.host == origin.host && request.url?.scheme == origin.scheme && request.url?.port == origin.port ? request : nil) }
}
struct SavedCookie: Codable {
 var name: String; var value: String; var domain: String; var path: String; var expires: Date?; var secure: Bool
 init(_ c: HTTPCookie) { name=c.name;value=c.value;domain=c.domain;path=c.path;expires=c.expiresDate;secure=c.isSecure }
 var cookie: HTTPCookie? { var p: [HTTPCookiePropertyKey:Any] = [.name:name,.value:value,.domain:domain,.path:path,.secure:secure ? "TRUE":"FALSE"]; if let expires { p[.expires]=expires }; return HTTPCookie(properties:p) }
}
enum Keychain {
 static let query: [String:Any] = [kSecClass as String:kSecClassGenericPassword,kSecAttrService as String:"com.drivewerkz.flowly",kSecAttrAccount as String:"session"]
 static func read() -> Data? { var q=query;q[kSecReturnData as String]=true;var result: CFTypeRef?;guard SecItemCopyMatching(q as CFDictionary,&result)==errSecSuccess else{return nil};return result as? Data }
 static func write(_ data: Data) throws { let update=[kSecValueData as String:data];let status=SecItemUpdate(query as CFDictionary,update as CFDictionary);if status==errSecItemNotFound { var q=query;q[kSecValueData as String]=data;q[kSecAttrAccessible as String]=kSecAttrAccessibleWhenUnlockedThisDeviceOnly;guard SecItemAdd(q as CFDictionary,nil)==errSecSuccess else{throw APIError(status:0,message:"Could not remember this session in Keychain.")}} else if status != errSecSuccess { throw APIError(status:0,message:"Could not update the saved session.") } }
 static func clear() { SecItemDelete(query as CFDictionary) }
}
@MainActor final class API {
 let base: URL
 let session: URLSession
 let cookies: HTTPCookieStorage
 let persistSession: Bool
 init(base: URL = URL(string:"https://flowly.drivewerkz.com")!, persistSession: Bool = true, configuration: URLSessionConfiguration? = nil) {
  self.base=base;self.persistSession=persistSession
  let config=configuration ?? URLSessionConfiguration.ephemeral;config.timeoutIntervalForRequest=20;config.timeoutIntervalForResource=25;config.waitsForConnectivity=true
  cookies=config.httpCookieStorage!;config.requestCachePolicy = .reloadIgnoringLocalCacheData
  session=URLSession(configuration:config,delegate:SameOrigin(origin:base),delegateQueue:nil)
  if persistSession,let data=Keychain.read(),let saved=try? JSONDecoder().decode([SavedCookie].self,from:data) { for c in saved { if let cookie=c.cookie,cookie.domain.trimmingCharacters(in:CharacterSet(charactersIn:"."))==base.host { cookies.setCookie(cookie) } } }
 }
 func request<T:Decodable>(_ path:String,method:String="GET",body:[String:Any]?=nil) async throws -> T {
  var req=URLRequest(url:URL(string:path,relativeTo:base)!.absoluteURL);req.httpMethod=method;req.setValue("application/json",forHTTPHeaderField:"Accept")
  if let body {req.httpBody=try JSONSerialization.data(withJSONObject:body);req.setValue("application/json",forHTTPHeaderField:"Content-Type")}
  let(data,response)=try await session.data(for:req)
  guard let response=response as? HTTPURLResponse else{throw APIError(status:0,message:"No response from Flowly.")}
  guard (200..<300).contains(response.statusCode) else { let msg: String;switch response.statusCode {case 401:msg="Your session expired. Sign in again; local drafts are retained.";case 409:msg="This note changed on another device. Your draft is safe. Export it or load the server version.";default:msg="Flowly could not complete this request (HTTP \(response.statusCode))."};throw APIError(status:response.statusCode,message:msg) }
  return try JSONDecoder().decode(T.self,from:data)
 }
 func account() async throws -> Account? { let reply:SessionReply?=try await request("/api/auth/session");return reply?.user }
 func signIn(email:String,password:String) async throws -> Account {
  let csrf:CSRF=try await request("/api/auth/csrf")
  var c=URLComponents();c.queryItems=[URLQueryItem(name:"csrfToken",value:csrf.csrfToken),URLQueryItem(name:"email",value:email),URLQueryItem(name:"password",value:password),URLQueryItem(name:"callbackUrl",value:base.absoluteString)]
  var r=URLRequest(url:base.appendingPathComponent("api/auth/callback/credentials"));r.httpMethod="POST";r.setValue("application/x-www-form-urlencoded",forHTTPHeaderField:"Content-Type");r.httpBody=c.percentEncodedQuery?.replacingOccurrences(of:"+",with:"%2B").data(using:.utf8)
  _=try await session.data(for:r)
  guard let user=try await account() else{throw APIError(status:401,message:"Email or password is incorrect.")}
  if persistSession {try Keychain.write(JSONEncoder().encode((cookies.cookies ?? []).filter{$0.name.contains("session-token")}.map(SavedCookie.init)))}
  return user
 }
 func signOut() { for cookie in cookies.cookies ?? [] {cookies.deleteCookie(cookie)};if persistSession{Keychain.clear()} }
 func tasks() async throws -> [FlowTask] {
  var result=[FlowTask]();var cursor:String?;var seen=Set<String>()
  repeat { let page:TasksReply=try await request("/api/tasks?limit=200"+(cursor.map{"&cursor=\($0)"} ?? ""));for task in page.tasks where seen.insert(task.id).inserted { result.append(task) };let next=page.nextCursor == nil ? nil : page.tasks.last?.id;if next==cursor { break };cursor=next } while cursor != nil
  return result
 }
}
