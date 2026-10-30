# Notes consolidation

Notes are private to the signed-in Flowly user. Project associations accept only that user's personal projects. Tasks created from a note carry a source link; the note content is not copied into shared task fields.

Apply `scripts/notes-schema.sql` once using the existing database connection. It only creates Notes tables and their relations. Then run:

```
node --env-file=.env scripts/import-noteflow.cjs /private/export.json owner@example.com
```

The importer accepts the source tables `notes`, `folders`, `attachments`, `activity_logs`, `webhooks`, and `webhook_logs` in one JSON snapshot. It refuses unhandled attachments or webhooks, refuses overwriting changed existing notes, preserves original IDs, HTML, tags, folders and timestamps, and verifies content checksums. Original activity logs remain in the private database backup. New saved revisions live in Flowly.

Stop source writes for the final snapshot. Back up both databases and uploads first. Verify imported counts/content before retiring the source. Retain the stopped source container and repository bundles for rollback. A code rollback to the previous release is compatible with the additive tables; never drop notes tables as part of code rollback.

Use NOTE_UPLOAD_DIR for private file storage outside the web root (default `/var/www/flowly/note-uploads`). Download routes require the owning user's session. Files are delivered as attachments with nosniff and restrictive CSP.

`node --env-file=.env scripts/test-notes.cjs` tests the API against an isolated preview server on localhost:3100. It refuses non-preview databases. Tests cover access isolation, stale-write conflicts, history, folders, attachments, full-content search and linked tasks.

The library supports HTML/text/Markdown-as-text and note JSON import. Markdown is retained as literal text. Browser-local Noteflow templates/version history are not part of its PostgreSQL data; those remain in the original browser's storage. Existing Joplin `:/resource-id` image references without corresponding files are preserved unchanged.
