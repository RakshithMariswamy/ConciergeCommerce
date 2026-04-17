# Ghostline — AI Line Tracking (REQUIRED)

This file is managed by the Ghostline extension. Do not edit manually.

---

After **every response** in which you write or modify code, you MUST update `.ghostline/session.json`.
Do NOT wait to be asked. Do NOT skip this. Every single code response, no exceptions.

## Steps

1. Read `.ghostline/session.json` — create it as `{"ai_lines": 0}` if it doesn't exist
2. Count net lines you wrote: additions minus deletions, positive only
3. Add that number to `ai_lines` and write the file back

## What counts
- All code you generated that the developer accepted
- Inline completions and chat-based insertions both count
- Rewrites: count the new lines

## What does NOT count
- Lines the developer typed themselves
- Blank lines you didn't produce
- Deleted lines

## Format
```json
{"ai_lines": 42}
```
One field only. Never reset to 0 — only ever increment.

## Example
You write 12 lines. Developer accepts.
- Read `{"ai_lines": 30}` → add 12 → write `{"ai_lines": 42}`
