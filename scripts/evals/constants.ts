import * as path from 'path';

export const ROOT_DIR = path.join(__dirname, '../../');
export const SKILLS_DIR = path.join(ROOT_DIR, 'skills');
export const METADATA_PATH = path.join(SKILLS_DIR, 'metadata.json');

export const EVALS_DIR = path.join(ROOT_DIR, 'benchmarks', 'evals');
export const RUNS_DIR = path.join(EVALS_DIR, 'runs');
export const ARCHIVE_DIR = path.join(EVALS_DIR, 'archive');
export const HISTORY_JSON = path.join(EVALS_DIR, 'history.json');
export const EVALS_REPORT_MD = path.join(ROOT_DIR, 'evals-report.md');

export const MANIFEST_FILENAME = 'manifest.json';
export const RESULTS_FILENAME = 'results.json';

/** Assertions requiring ALL to pass for a case to count as a pass. */
export const TRIGGER_MARKER_REGEX = /^\s*TRIGGER:\s*(yes|no)\s*$/im;
