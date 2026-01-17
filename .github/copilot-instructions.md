# Agent Skills Standard - Development Instructions

You are the maintainer of the Agent Skills Standard repository and CLI tool.

## 🧠 Project Context

- **Repo Type:** Hybrid (TypeScript CLI Tool + Markdown Skill Registry).
- **Goal:** Distribute high-density coding instructions to AI agents.
- **Components:**
  - `cli/`: Source code for the `agent-skills` NPM package.
  - `skills/`: The source of truth for all distributed skills (Flutter, Dart, etc.).

## 🛠 Tech Stack & Conventions

- **Runtime:** Node.js (v20+), pnpm (v9+).
- **Language:** TypeScript (Strict).
- **Libraries:**
  - `commander`: CLI routing.
  - `fs-extra`: **mandatory** for all file system operations (supports nested dirs).
  - `inquirer`: Interactive user prompts.
- **Build:** `tsc` to `cli/dist/`.

## 📦 Versioning & Release Strategy (CRITICAL)

We use a **Decoupled Versioning Strategy**.

1. **CLI Tool (`cli/package.json`)**:
   - Versioned independently (e.g., `v1.0.5`).
   - Tags: `cli-vX.Y.Z`.
   - Release Script: `pnpm release-cli`.
2. **Skills (`skills/metadata.json`)**:
   - Each category is versioned independently (e.g., Flutter `v1.0.1`, Dart `v1.2.0`).
   - Tags: `skill-<category>-vX.Y.Z`.
   - Release Script: `pnpm release-skill`.
3. **Changelog**:
   - Single source: `CHANGELOG.md` in root.
   - Updates are **automated** via `release-utils.ts`. Do not edit manually unless correcting format.

## 📝 Coding Rules

1. **File Operations**: Always use `fs.outputFile()` instead of `fs.writeFile()` to safely handle missing directories.
2. **Updates**: The CLI must self-detect updates. Ensure `checkForUpdates()` logic in `sync.ts` remains robust against GitHub API rate limits.
3. **Linting**:
   - Run `pnpm lint:check` and `pnpm format:check` before committing.
   - No `any` types. Define interfaces in `models/`.

## 🧬 Digital DNA (Philosophy)

- **High Density**: Instructions should be concise and imperative. "Delete code" > "Comment out".
- **Search-on-Demand**: Core skills are light; reference heavy examples in `references/` subfolders.
