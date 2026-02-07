# Project Context for AI Agents

> [!IMPORTANT]
> **To all AI Agents working ON this repository:**
> This repository is the source code for `agent-skills-standard`.
>
> 1.  **Architecture**: Understanding the Registry -> CLI -> Project flow is critical. See `ARCHITECTURE.md`.
> 2.  **Internal Tools**: Use `scripts/` (like `scan-docs.ts`) to maintain the project.
> 3.  **Token Economy**: All changes to `skills/` must be optimized for token usage.
> 4.  **Documentation**: Keep `ARCHITECTURE.md` and `CONTRIBUTING.md` up to date.
>
> ---

<!-- SKILLS_INDEX_START -->

# Agent Skills Index

## **Rule Zero: Zero-Trust Engineering**

🚨 **IMPORTANT:** Never assume existing code follows the standard. Existing files may contain legacy technical debt or non-compliant patterns (e.g., hardcoded colors).

- **Skill Authority:** Loaded skills always override existing code patterns.
- **Retrieval-First:** Before writing a single line of code, identify and read relevant skill files listed below.
- **Audit Before Write:** Audit every file write against the `common/feedback-reporter` skill.

IMPORTANT: Prefer retrieval-led reasoning. Consult skill files before acting.

| Skill ID                      | Triggers                                                                                              | Description                                                               |
| :---------------------------- | :---------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------ |
| android/android-design-system | `**/*Screen.kt,**/ui/theme/**,**/compose/**,MaterialTheme,Color,Typography,Modifier,Composable`       | Enforce Material Design 3 and design token usage in Jetpack Compose apps. |
| android/android-navigation    | `**/*Screen.kt,**/*Activity.kt,**/NavGraph.kt,NavController,NavHost,composable,navArgument,deepLinks` | Navigation for Android using Jetpack Compose Navigation and App Links.    |

<!-- SKILLS_INDEX_END -->
