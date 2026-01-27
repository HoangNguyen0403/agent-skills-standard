---
description: Measure effectiveness and productivity with and without Agent Skill Standard
---

# Validate Agent Skill Impact

This workflow guides you through setting up a controlled A/B test (Control vs. Experiment) on an existing real-world project to measure the effectiveness of the Agent Skills Standard.

## 1. Prepare Configuration

Create a JSON configuration file defining the project to test and the scenarios to measure.
You can use the template at `experiment_validation/validation-schema.json`.

**Example Config (`my_test_config.json`):**

```json
{
  "project": {
    "name": "my-app-validation",
    "repoUrl": "https://github.com/my-org/my-real-app",
    "branch": "develop",
    "framework": "flutter" // or 'react', 'nestjs'
  },
  "scenarios": [
    {
      "title": "Refactor Feature X",
      "prompt": "Refactor the PaymentController to use the new Service layer...",
      "successCriteria": ["Logic removed from UI", "Service injected via DI"]
    }
  ]
}
```

Save this file anywhere, for example in `experiment_validation/configs/my_test.json`.

## 2. Run Setup Automation

Execute the setup script to prepare the environment. This will:

1.  Clone your repository into `experiment_validation/control` and `experiment_validation/experiment`.
2.  **Experiment Group**: Automatically injects `agent-skills-standard` (using the framework profile).
3.  **Control Group**: Ensures a clean state (removes any existing skills).
4.  Generates a `SCORECARD.md` for you to track results.

```bash
npx tsx experiment_validation/scripts/setup_experiment.ts experiment_validation/configs/my_test.json
```

## 3. Execute Scenarios (A/B Testing)

Open the generated `SCORECARD.md` in the root folder. For each scenario:

### Test A: Control Group

1.  Open the workspace: `experiment_validation/control/<project-name>`
2.  Input the **Prompt** defined in the scorecard to your AI Agent.
3.  Record the results:
    - **Turns**: How many prompts did it take?
    - **Quality**: Any lint errors? logic bugs?
    - mark as `Failed` if it hallucinated or violated standards.

### Test B: Experiment Group

1.  Open the workspace: `experiment_validation/experiment/<project-name>`
2.  Input the **same Prompt** to your AI Agent.
    - _Note: The agent should verify that skills are loaded (e.g., via `.cursor/skills` or `.agent/skills`)._
3.  Record the results.

## 4. Analyze & Report

Compare the results in `SCORECARD.md`.

- Calculate the % reduction in turns/prompts.
- Note the qualitative differences (e.g., "Experiment group correctly used BLoC pattern, Control group used setState").

Run this command to easily calculate the diffs if user requested:

```bash
# Optional: View diff between control and experiment implementations
diff -r experiment_validation/control/<project>/lib experiment_validation/experiment/<project>/lib
```
