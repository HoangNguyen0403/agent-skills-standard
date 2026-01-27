# Agent Skill Validation Experiment 🧪

A framework for conducting A/B testing to measure the impact of **Agent Skills Standard** on engineering productivity and code quality.

## 🚀 Overview

This tool automates the setup of a controlled experiment environment:

1.  **Control Group**: A clean version of your project using standard AI context.
2.  **Experiment Group**: The same project **pre-loaded with Agent Skills**.
3.  **Scorecard**: A generated template to track metrics (velocity, quality, errors).

## 📋 Prerequisites

- Node.js (v18+)
- Git
- `agent-skills-standard` CLI (executed via `npx`).

## ⚙️ Configuration

Create a JSON configuration file defining your project and test scenarios.
**Schema**: `validation-schema.json`

**Example** (`configs/my_experiment.json`):

```json
{
  "project": {
    "name": "my-app-test",
    "repoUrl": "https://github.com/my-org/my-app",
    "branch": "main",
    "framework": "flutter" // 'flutter', 'react', 'nestjs', etc.
  },
  "scenarios": [
    {
      "title": "Refactor Feature X",
      "prompt": "Refactor the authentication logic...",
      "successCriteria": ["Clean Architecture", "No UI Logic"]
    }
  ]
}
```

## run_setup 🏃‍♀️ Running the Setup

Use `npx tsx` to run the setup script. It accepts your config file as an argument.

```bash
npx tsx experiment_validation/scripts/setup_experiment.ts <path-to-config>
```

**Example:**

```bash
npx tsx experiment_validation/scripts/setup_experiment.ts experiment_validation/configs/flutter_listing_experiment.json
```

> **Note**: The script runs interactively. When prompted for `agent-skills-standard init`, follow the CLI wizard to select the appropriate Agent/Framework.

## 🧪 Conducting the Experiment

Once setup is complete, you will have two folders in the `experiment_validation/` directory (created at the project root):

- `control/<project-name>`
- `experiment/<project-name>`

### Steps:

1.  Open `SCORECARD.md` (generated in the root of the repo).
2.  **Test Control**: Open the `control` folder in your IDE. Copy the prompt from the scorecard. Run it with your AI. Record results (turns, errors).
3.  **Test Experiment**: Open the `experiment` folder. Run the same prompt. Record results.
4.  **Compare**: Note the differences in standard adherence, automated test generation, and number of conversational turns.
