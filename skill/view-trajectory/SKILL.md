---
name: view-trajectory
description: Open a Claude Code session trajectory (.jsonl) in the cc-trajectory-viewer web UI to inspect the timeline, clustered tool calls, and code diffs. Can also generate an annotations sidecar that adds one-line summaries for each tool-call cluster and translations of every message into a target language. Use when the user asks to visualize, view, open, summarize, or translate a trajectory / session log.
---

# View a Claude Code trajectory

`@xinyuehtx/cc-trajectory-viewer` renders a Claude Code **trajectory** (`.jsonl`
session log) as a web UI: a message **Timeline** (with consecutive tool calls
grouped into collapsible clusters), and a separate **Diffs** tab showing every
file change as a unified or split code diff.

The `cctv` command is provided by the package. Prefer `npx -y @xinyuehtx/cc-trajectory-viewer …`.

## 1. Just view a trajectory

```bash
npx -y @xinyuehtx/cc-trajectory-viewer "<path-to-session>.jsonl"
```

Add `--no-open` for headless, `-p <port>` to choose a port. Run with no path to
open drag-and-drop upload mode.

### Locating the file

Sessions live at `~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl`, where
`<encoded-cwd>` is the project's absolute path with `/` and `.` replaced by `-`.
To open the newest session for a project directory:

```bash
DIR="$HOME/.claude/projects/$(echo "$PWD" | sed 's#[/.]#-#g')"
FILE=$(ls -t "$DIR"/*.jsonl 2>/dev/null | head -1)
npx -y @xinyuehtx/cc-trajectory-viewer "$FILE"
```

If the user names a specific file or session id, use that directly.

## 2. Add summaries and/or translations (annotations)

The viewer can overlay a sidecar **annotations** file (`<file>.cctv.json`) that
adds, per stable id:

- a **one-line summary** for each cluster of consecutive tool calls (shown in the
  cluster header), and
- a **translation** of each user/assistant message into a target language (shown
  beneath the original text).

**Workflow — you (the agent) fill in the annotations:**

1. **Generate the scaffold.** This writes a `.cctv.json` next to the trajectory
   with every text unit (with its `original` text) and every tool-call cluster
   (with the tool names) already enumerated and correctly keyed:

   ```bash
   npx -y @xinyuehtx/cc-trajectory-viewer extract "<file>.jsonl" --lang "<target language>"
   ```

   Use the language the user asked for (e.g. `简体中文`, `English`, `日本語`); omit
   `--lang` if they only want summaries.

2. **Read the scaffold** (`<file>.jsonl.cctv.json`). It looks like:

   ```json
   {
     "version": 1,
     "targetLang": "简体中文",
     "units": [
       { "type": "text", "id": "<uuid>", "role": "user", "original": "…", "translation": "" },
       { "type": "cluster", "id": "<tool_use id>", "tools": ["Read","Edit"], "count": 2, "summary": "" }
     ]
   }
   ```

3. **Fill in the empty fields**, editing the file in place:
   - For each `cluster` unit, write a concise (≤ ~12 word) `summary` of what that
     run of tool calls accomplished, based on its `tools` and the surrounding
     context in the trajectory.
   - For each `text` unit, write the `translation` of `original` into the target
     language. Preserve Markdown and code. Leave `translation` empty to skip a unit.
   - **Do not** change any `id`, `type`, `original`, or `tools` field — those keys
     bind the annotation to the right place in the UI.

4. **Open the viewer** — it auto-loads the sibling `.cctv.json`:

   ```bash
   npx -y @xinyuehtx/cc-trajectory-viewer "<file>.jsonl"
   # or explicitly:  … "<file>.jsonl" --ann "<file>.jsonl.cctv.json"
   ```

In the UI, cluster summaries appear in each cluster's header, and translations
appear under each message (toggle "Show translations" in the sidebar).

## Notes

- `npx` fetches the published package, which bundles the built HTML — no build step.
- From a local clone, run `npm run build` first, then `node bin/cli.js …`.
- Everything is served from `localhost`; nothing is uploaded.
