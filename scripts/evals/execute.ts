import { spawn } from "node:child_process";
import os from "node:os";
import fs from "fs-extra";
import * as path from "node:path";
import { answerPath, loadManifest, saveManifest } from "./manifest";
import { readCurrentSource, sourceKey } from "./snapshot";
import type { ArmName, ManifestSkill } from "./types";

export type EvalRunner = (prompt: string) => Promise<string>;

export class EvalQuotaPausedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvalQuotaPausedError";
  }
}

export const DEFAULT_EVALS_MODEL = "gpt-5.6-luna";
export const DEFAULT_EVALS_REASONING_EFFORT = "high";
const MINIMUM_EVAL_ANSWER_LENGTH = 10;

export interface EvalWorkerConfig {
  model: string;
  reasoningEffort: "low" | "medium" | "high" | "xhigh";
}

export function evalWorkerConfig(
  env: NodeJS.ProcessEnv = process.env,
): EvalWorkerConfig {
  const reasoningEffort =
    env.EVALS_REASONING_EFFORT ?? DEFAULT_EVALS_REASONING_EFFORT;
  if (
    !(["low", "medium", "high", "xhigh"] as const).includes(
      reasoningEffort as EvalWorkerConfig["reasoningEffort"],
    )
  ) {
    throw new Error(
      "EVALS_REASONING_EFFORT must be one of: low, medium, high, xhigh.",
    );
  }
  return {
    model: env.EVALS_MODEL?.trim() || DEFAULT_EVALS_MODEL,
    reasoningEffort: reasoningEffort as EvalWorkerConfig["reasoningEffort"],
  };
}

export function codexExecArgs(
  repoRoot: string,
  config: EvalWorkerConfig,
): string[] {
  return [
    "exec",
    "--ephemeral",
    "--ignore-user-config",
    "--ignore-rules",
    "--model",
    config.model,
    "--config",
    `model_reasoning_effort=${JSON.stringify(config.reasoningEffort)}`,
    "--sandbox",
    "read-only",
    "-C",
    repoRoot,
  ];
}

function quotaPausedError(stderr: string): EvalQuotaPausedError | undefined {
  if (!/hit your usage limit|usage limit|rate limit/i.test(stderr)) {
    return undefined;
  }
  const retryAt = stderr.match(/try again at ([^.\n]+(?:\.[^.\n]+)?)/i)?.[1];
  return new EvalQuotaPausedError(
    retryAt
      ? `Codex usage limit reached; try again at ${retryAt}.`
      : "Codex usage limit reached; retry after quota access is restored.",
  );
}

/** Count unfilled lanes without starting a worker or reading prompt content. */
export function missingAnswerCount(runDir: string): number {
  const manifest = loadManifest(runDir);
  let missing = 0;
  for (const skill of manifest.skills) {
    for (const currentCase of skill.cases) {
      const arms: Array<ArmName | undefined> =
        currentCase.kind === "trigger"
          ? [undefined]
          : ["baseline", "with-skill"];
      for (const arm of arms) {
        if (
          !fs.existsSync(
            answerPath(runDir, manifest, skill, currentCase.id, arm),
          )
        ) {
          missing += 1;
        }
      }
    }
  }
  return missing;
}

function promptPath(
  runDir: string,
  category: string,
  skill: ManifestSkill,
  caseId: string,
): string {
  const aggregatePath = path.join(
    runDir,
    "prompts",
    ...(category === "all" ? [skill.category] : []),
    skill.skillName,
    `${caseId}.md`,
  );
  if (fs.existsSync(aggregatePath) || category !== "all") return aggregatePath;
  // Compatibility for selective aggregate manifests created before category paths were fixed.
  return path.join(runDir, "prompts", skill.skillName, `${caseId}.md`);
}

function isolatedInstruction(prompt: string, skillMarkdown?: string): string {
  return [
    "You are an isolated evaluation worker. Do not inspect repository files, use tools, or infer hidden labels.",
    "Return only the answer to the supplied task. Do not describe this instruction.",
    skillMarkdown ? `\n# Loaded skill\n${skillMarkdown}` : "",
    `\n# Task\n${prompt}`,
  ].join("\n");
}

export function codexRunner(
  repoRoot: string,
  config = evalWorkerConfig(),
): EvalRunner {
  return (prompt) =>
    new Promise((resolve, reject) => {
      const tempDir = fs.mkdtempSync(
        path.join(os.tmpdir(), "ags-eval-worker-"),
      );
      const outputPath = path.join(tempDir, "answer.md");
      const execution = spawn(
        "codex",
        [
          ...codexExecArgs(repoRoot, config),
          "--output-last-message",
          outputPath,
          "-",
        ],
        { stdio: ["pipe", "ignore", "pipe"] },
      );
      let stderr = "";
      execution.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      execution.on("error", (error) => {
        fs.removeSync(tempDir);
        reject(error);
      });
      execution.on("close", (code) => {
        try {
          if (code !== 0) {
            const quotaError = quotaPausedError(stderr);
            if (quotaError) throw quotaError;
            throw new Error(`Codex eval worker failed: ${stderr}`);
          }
          const answer = fs.readFileSync(outputPath, "utf8").trim();
          if (!answer)
            throw new Error("Codex eval worker returned no final answer.");
          resolve(answer);
        } catch (error) {
          reject(error);
        } finally {
          fs.removeSync(tempDir);
        }
      });
      execution.stdin.end(prompt);
    });
}

/** Execute only answer files not already reused from an immutable baseline. */
export async function executeMissingAnswers(
  runDir: string,
  options: {
    repoRoot: string;
    runner?: EvalRunner;
    now?: Date;
    concurrency?: number;
    workerConfig?: EvalWorkerConfig;
  },
): Promise<number> {
  const manifest = loadManifest(runDir);
  const workerConfig = options.workerConfig ?? evalWorkerConfig();
  const runner = options.runner ?? codexRunner(options.repoRoot, workerConfig);
  const jobs: Array<{ output: string; prompt: string; evidence: string }> = [];
  for (const skill of manifest.skills) {
    const source = readCurrentSource(options.repoRoot, skill);
    for (const currentCase of skill.cases) {
      const prompt = fs.readFileSync(
        promptPath(runDir, manifest.category, skill, currentCase.id),
        "utf8",
      );
      const arms: Array<ArmName | undefined> =
        currentCase.kind === "trigger"
          ? [undefined]
          : ["baseline", "with-skill"];
      for (const arm of arms) {
        const output = answerPath(runDir, manifest, skill, currentCase.id, arm);
        if (fs.existsSync(output)) continue;
        jobs.push({
          output,
          prompt: isolatedInstruction(
            prompt,
            arm === "with-skill" ? source.skillMarkdown : undefined,
          ),
          evidence: `${sourceKey(skill.category, skill.skillName)} ${currentCase.id}`,
        });
      }
    }
  }
  const configuredConcurrency =
    options.concurrency ?? Number(process.env.EVALS_CONCURRENCY ?? 1);
  const concurrency = Math.max(1, Math.min(4, configuredConcurrency || 1));
  let next = 0;
  const executions = await Promise.allSettled(
    Array.from({ length: Math.min(concurrency, jobs.length) }, async () => {
      while (next < jobs.length) {
        const job = jobs[next++];
        if (!job) return;
        const response = await runner(job.prompt);
        if (!response) throw new Error(`Empty response for ${job.evidence}`);
        if (response.trim().length < MINIMUM_EVAL_ANSWER_LENGTH) {
          throw new Error(
            `Eval worker returned an unusably short answer for ${job.evidence}; response was not saved.`,
          );
        }
        fs.ensureDirSync(path.dirname(job.output));
        fs.writeFileSync(job.output, `${response}\n`);
      }
    }),
  );
  const failed = executions.find(
    (execution): execution is PromiseRejectedResult =>
      execution.status === "rejected",
  );
  if (failed) {
    const quotaError = executions.find(
      (execution): execution is PromiseRejectedResult =>
        execution.status === "rejected" &&
        execution.reason instanceof EvalQuotaPausedError,
    );
    if (quotaError) {
      throw new EvalQuotaPausedError(
        `${quotaError.reason.message} Progress is saved; ${missingAnswerCount(runDir)} fresh answer(s) remain. Rerun the same command with --execute.`,
      );
    }
    throw failed.reason;
  }
  manifest.metadata = {
    ...manifest.metadata,
    agent: "Codex CLI isolated worker",
    model: workerConfig.model,
    reasoningEffort: workerConfig.reasoningEffort,
    completedAt: (options.now ?? new Date()).toISOString(),
  };
  saveManifest(runDir, manifest);
  return jobs.length;
}
