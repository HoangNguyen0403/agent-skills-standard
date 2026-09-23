import type { SkillResult } from "./types";

export const STRICT_CASE_PASS_THRESHOLD = 0.85;
export const ASSERTION_PASS_THRESHOLD = 0.85;
export const ACTIVATION_THRESHOLD = 0.9;

export interface SkillReadiness {
  ready: boolean;
  outcomeReady: boolean;
  activationReady: boolean;
  failures: string[];
}

function metric(value: number | "n/a" | null | undefined): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function outcomeFailures(skill: SkillResult, compromised: boolean): string[] {
  const failures: string[] = [];
  const casePass = metric(
    skill.casePassRate?.withSkill ?? skill.withSkillPassRate,
  );
  const assertionPass = metric(skill.assertionPassRate?.withSkill);

  if (compromised) failures.push("baseline evidence is compromised");
  if (casePass === undefined || casePass <= STRICT_CASE_PASS_THRESHOLD)
    failures.push("with-skill case pass must exceed 85%");
  if (assertionPass === undefined || assertionPass < ASSERTION_PASS_THRESHOLD)
    failures.push("with-skill assertion pass must reach 85%");
  if (typeof skill.delta !== "number" || skill.delta < 0)
    failures.push("outcome delta must be non-negative");
  if (skill.incompleteArms.length > 0)
    failures.push("run has incomplete answer arms");
  return failures;
}

function activationFailures(skill: SkillResult): string[] {
  const failures: string[] = [];
  const recall = metric(skill.triggerRecall);
  const specificity = metric(skill.triggerSpecificity);

  if (recall === undefined || recall < ACTIVATION_THRESHOLD)
    failures.push("trigger recall must reach 90%");
  if (specificity === undefined || specificity < ACTIVATION_THRESHOLD)
    failures.push("trigger specificity must reach 90%");
  return failures;
}

export function evaluateSkillReadiness(
  skill: SkillResult,
  options: {
    compromised?: boolean;
    activationEvidenceTrusted?: boolean;
  } = {},
): SkillReadiness {
  const outcomeFailuresList = outcomeFailures(
    skill,
    options.compromised ?? false,
  );
  const activationFailuresList =
    options.activationEvidenceTrusted === false
      ? ["activation evidence is not trusted"]
      : activationFailures(skill);
  return {
    ready:
      outcomeFailuresList.length === 0 && activationFailuresList.length === 0,
    outcomeReady: outcomeFailuresList.length === 0,
    activationReady: activationFailuresList.length === 0,
    failures: [...outcomeFailuresList, ...activationFailuresList],
  };
}
