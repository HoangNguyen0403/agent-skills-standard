---
description: Interactive workflow to plan a new feature from scratch, from Interview to Task List.
---

# Feature Planning Workflow

This workflow guides you from a vague idea to a fully planned implementation workspace.

## 1. Requirement Gathering (Interview)

Trigger the PRD skill to interview the user and gather full context. This step is interactive.

**Instruction**:
"Please act as a Product Manager. Reference `skills/common/product-requirements/SKILL.md`. Start the **Discovery Phase** to gather requirements for the new feature the user wants to build. Ask clarifying questions until you have enough info."

## 2. PRD Generation

Once the interview is complete, generate the formal PRD.

**Instruction**:
"Based on the gathering findings, generate the PRD using the template at `skills/common/product-requirements/references/prd-template.md`. Save it to `docs/specs/prd-[feature_name].md`. Then, validate it using `skills/common/product-requirements/references/checklist.md`."

## 3. Implementation Planning

Convert the "What" (PRD) into "How" (Plan).

**Instruction**:
"Analyze the generated PRD. Create an `implementation_plan.md` artifact.

- Break down the PRD into technical components.
- Identify necessary file changes.
- Define a Verification Plan (Automated & Manual tests)."

## 4. Task Initialization

Set up the workspace for execution.

**Instruction**:
"Initialize `task.md` based on the Implementation Plan.

- Create granular checklist items.
- Ensure the first task consists of setup or structural changes."
