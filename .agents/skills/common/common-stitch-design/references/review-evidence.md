# Stitch Review Evidence & Verification Protocol

Detailed rules for capturing, verifying, and reporting evidence during Stitch design reviews.

## 1. Identity & Currentness Verification

- **Screen Identity**: A project contains multiple screens, and each screen title may have multiple historical versions. Record the specific screen ID and title. Record a creation/update timestamp only when the tool actually supplies one; never infer a time or treat file mtime as screen identity.
- **Currentness Is Not Established by the Thumbnail**: `project.thumbnailUrl` is not evidence of a current screen — it can predate a screen, lag the latest version, or depict a different one. Review actual screen artifacts (`get_screen` screenshot and HTML downloads) before making current-screen claims. A thumbnail-only review is a historical critique and MUST be labelled as such.
- **Design System Binding**: Record the applied design system asset ID (`assets/<id>`) only when the tool reports it. If no binding is reported, record binding **unknown or absent**; never infer an unstyled or default theme, because the screen may carry bespoke styling.

## 2. File Download Verification

- **Never Trust Success Strings Alone**: A tool response stating "download successful" or returning a signed URL does not prove that bytes arrived on disk.
- **Validate Media, Not Just Size**: Check that retained bytes match the expected media: a screenshot must decode as an image of the expected format (PNG/JPEG/WebP signature and decoder success) and an HTML download must be an HTML document. An HTML error body, JSON error payload, or truncated file with non-zero size is a failed retrieval, not evidence.
- **Decode Dimensions**: Open the retained screenshot with a decoder and record its actual decoded width/height (and whether a DPR-scaled viewport was requested). Dimensions that contradict the requested screen or viewport leave the identity unresolved.
- **Bind Artifacts by Digest**: Compute SHA-256 for each retained artifact and bind the digest to the requested project, screen, and source artifact it claims to be. Unknown identity stays unknown — never infer it from filenames, ordering, or proximity.
- **Preserve Originals**: Store fetched screenshots and HTML in `.stitch/review/<date-or-slug>/` with immutable filenames. Do not overwrite or mutate original downloaded artifacts.

## 3. HTML Audit Boundaries & False GREEN Prevention

- **Audit Prerequisites**: `node scripts/audit_html.js <dir>` requires valid HTML files in the target directory.
- **No Empty-Audit Pass**: If HTML is unavailable or failed validation, the audit check is `NOT RUN (HTML unavailable)` and the DOM lane is `NOT ASSESSED`. An empty directory, zero analyzed files, or an invalid HTML payload must NEVER be reported as a clean audit or passing score (false GREEN).
- **DOM vs Visual Claims**: Objective contrast and semantic element claims require DOM/HTML inspection. Do not fabricate CSS selectors or DOM node properties when only a screenshot was inspected.

## 4. Evidence Limits of Screenshots

Screenshots provide visual evidence of rendered composition at a specific viewport. They have explicit evidentiary limits:
- **No DOM Structure Proof**: A visual image cannot prove semantic HTML tag hierarchy (e.g., `<main>`, `<header>`, `<h1>`–`<h6>`).
- **No Accessibility or Keyboard Proof**: A screenshot cannot demonstrate keyboard tab order, focus indicators, ARIA attributes, or screen-reader usability.
- **No Touch or Gesture Proof**: A static image cannot prove touch target responsiveness, scroll momentum, or swipe ergonomics.
- **No Device Equivalence**: A desktop browser capture at mobile dimensions does not prove native mobile ergonomics.

## 5. Bounded Image Inspection

- **Size Budget**: Bound image previews to `<=1600px` on the longest edge before model ingestion using aspect-preserving scaling (`sips -Z 1600` or `magick`).
- **Viewport vs Full-Page**: Never capture or review unreadable full-page screenshots (`fullPage`). Inspect the primary viewport and separate scoped section captures for tall pages.
- **DPR Scaling**: Account for `devicePixelRatio` when calculating physical dimensions (`CSS pixels × DPR`).

## 6. Partial Review & Access Blockers

- **Block Only Dependent Lanes**: When Stitch MCP tools are absent or credentials fail, block exactly the lanes that depend on that access — current-screen retrieval, identity/currentness verification, and any write. Return `BLOCKED (stitch-mcp)` for those lanes with the setup path, and continue any critique that genuine retained evidence supports.
- **Bounded Historical Critique**: When only historical evidence exists (a previously retained screenshot, an exported artifact, or the project thumbnail), a review of that artifact is permitted ONLY when labelled as historical: name the artifact, state that currentness is not established, and never present it as the current screen or as a freshness-equivalent substitute. Historical evidence does not carry current-screen conclusions.
- **No Credential or Config Mutation**: Lack of access is NEVER permission to edit user credentials, alter `.omp/mcp.json` or daemon configuration, or invent mock data or tool parameters.
- **Partial Evidence Reporting**: When only partial evidence is retrievable (e.g., screenshot retrieved but HTML download failed or failed media validation), conduct visual critique on the accessible surface and explicitly mark the unretrieved lanes as `NOT ASSESSED`, with the skipped check reported as `NOT RUN` and its reason. Do not block independent safe analysis, but never claim unverified lanes passed.

## 7. Taste Authority & Justified No-Change

- **Score Cannot Replace Human Taste**: Automated scores, metric tallies, or heuristic rubrics never equal human visual acceptance.
- **Human Preference Authority**: The maintainer or author holds final aesthetic authority. Their choice to retain the baseline or select a specific variant does not require empirical justification.
- **Justified No-Change**: If the original screen meets human direction and satisfies task requirements, branching to a justified no-change outcome is fully valid. Do not generate variants or new design systems solely to demonstrate activity.
