#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p .build
swiftc -parse-as-library Sources/Flowly/API.swift Sources/Flowly/Models.swift Sources/Flowly/Store.swift Tests/SmokeTests.swift -o .build/FlowlySmokeTests
.build/FlowlySmokeTests
