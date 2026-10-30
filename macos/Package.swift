// swift-tools-version: 5.9
import PackageDescription
let package = Package(name: "Flowly", platforms: [.macOS(.v14)], products: [.executable(name: "Flowly", targets: ["Flowly"])], targets: [.executableTarget(name: "Flowly")])
