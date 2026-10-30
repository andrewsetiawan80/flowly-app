# Flowly for Mac — 0.1 preview

A native SwiftUI macOS client for the existing Flowly server. The sidebar, task lists, editors, menus and quick capture are native controls. Imported HTML notes use an isolated WebKit viewer with JavaScript and remote resources disabled.

## Included

- Today (due today and overdue), Inbox, personal Projects, and Notes.
- Email/password sign-in using Flowly's existing Auth.js session. Passwords are never persisted; session cookies are stored in Keychain.
- Task creation, completion, status, priority, project and due-date editing.
- Plain note editing with debounced autosave and optimistic version checks.
- Account-isolated local note drafts, retained on failure, app exit or sign-out. Draft files are private to the local user (0600), not separately encrypted by this app.
- Lossless preservation of imported HTML, read-only formatted preview, optional HTML source editing, and a link to the web rich-text editor.
- Menu-bar quick capture, dark/light/system appearance, keyboard shortcuts and optional scheduling of current task reminders.
- Read-only sample preview available without sign-in.

## Current limits

This is a first local build, not an App Store release. It is built for Apple Silicon and macOS 14 or later. Full offline library access, automatic two-way offline sync, native rich-text formatting, shared workspace administration, file attachments and automatic app updates are not implemented. Notes remain private. The task detail form uses an explicit Save Task button.

The app requires reachability of `https://flowly.drivewerkz.com` through local DNS or VPN. At validation time, this Mac blocked the ad-hoc-signed app with `Local network prohibited`, did not display it in Local Network settings, and had no Apple-issued signing identity installed. The CLI API tests succeeded, but this does not establish access for the bundled app. Do not disable network privacy or certificate checks to work around this.

For ordinary installation, open the app from Finder and allow the standard Local Network prompt if presented. If it remains blocked or absent from System Settings → Privacy & Security → Local Network, use an Apple-issued development/signing identity and retest. See Apple's TN3179: https://developer.apple.com/documentation/technotes/tn3179-understanding-local-network-privacy . Developer ID distribution and notarization are separate from this local preview.

## Build

Apple Command Line Tools with Swift 5.9+ are sufficient to compile. Full Xcode is not required for the smoke tests.

```sh
./scripts/build-app.sh /absolute/path/to/output
```

The script builds a release executable, creates `Flowly.app`, packages the existing Flowly icon, and applies an ad-hoc signature. For an Apple signing identity, replace the ad-hoc signing step with your approved signing workflow; never commit certificates or credentials.

## Test

```sh
./scripts/test.sh
FLOWLY_LIVE_READ_ONLY=1 ./scripts/test.sh
```

Optional integration tests require the isolated local Next.js preview on port 3100 and its disposable seeded `demo@example.com` account:

```sh
FLOWLY_LOCAL_API_TEST=1 ./scripts/test.sh
```

These exercise native cookie authentication, task/project decoding, note creation and save, stale-write rejection, and sign-out. Created fixture notes are archived in the isolated database. No production writes are made by these tests.

Shortcuts: ⌘N task, ⇧⌘N note, ⌘S save note, ⌘R refresh, ⌘, settings.
