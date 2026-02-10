# Changelog

All notable changes to Flowly will be documented in this file.

Format follows [Semantic Versioning](https://semver.org/).

---

## [0.3.0] - 2026-02-11

### Added
- **Workspace & Team Collaboration** — Create workspaces, invite members, assign roles (Owner/Admin/Member), shared projects
- **Automations Engine** — If-then rule builder with triggers (task created/updated/due) and actions (change status/priority, move project, Slack notification)
- **Timeline / Gantt View** — Horizontal timeline with configurable date range, color-coded bars by priority/status
- **Table View** — Spreadsheet-style view with sortable columns, inline editing, and multi-select batch operations
- **Kanban Board** — Drag-and-drop task cards between status columns
- **Calendar View** — Monthly calendar with task due dates
- **Statistics Dashboard** — Recharts-powered charts (donut, area, bar) for task completion, priority distribution, and trends
- **Settings Page** — Slack webhook integration, iCal calendar feed, JSON/CSV data export
- **Notification Center** — In-app bell icon with activity feed
- **Theme Selector** — Multiple accent color themes
- **Mobile Bottom Navigation** — Fixed bottom nav bar for small screens
- **Sidebar Collapse** — Collapsible sidebar with main content auto-adjusting
- **Task Dependencies** — Link tasks with depends-on / blocked-by relationships
- **Project Templates** — Save and create projects from templates
- **Comments System** — Add comments to tasks
- **File Attachments** — Upload and manage files on tasks
- **Subtask CRUD** — Full create/update/delete API for subtasks
- **Recurring Tasks** — Daily/weekly/monthly recurrence with auto-creation cron job
- **API Key Authentication** — Service-to-service auth via `x-api-key` header
- **Logo Integration** — Custom Flowly logo across app and manifest

### Fixed
- Kanban card titles no longer truncated — full titles now visible
- Sidebar collapse properly adjusts main content area padding
- Right-side content no longer clipped on desktop
- React hooks error #310 from conditional hook calls in sidebar
- Mobile responsiveness across all views (touch targets, overflow, grid layouts)
- Toast notifications positioned above mobile bottom nav

---

## [0.2.0] - 2026-01-18

### Added
- Hierarchical projects with sub-projects and tasks
- Checklist project type
- Task management with priorities, due dates, and status
- Dark/light mode
- Command palette with keyboard shortcuts
- Pomodoro focus timer
- Tags/labels system
- Activity history logging
- Webhooks with HMAC-SHA256 signatures
- Dashboard with quick-add and task overview

---

## [0.1.0] - 2026-01-01

### Added
- Initial release
- User authentication (NextAuth.js)
- Basic task and list management
- PostgreSQL database with Prisma ORM
- Docker deployment setup
