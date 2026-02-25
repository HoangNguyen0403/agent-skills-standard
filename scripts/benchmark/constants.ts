import * as path from 'path';

export const ROOT_DIR = path.join(__dirname, '../../');
export const SKILLS_DIR = path.join(ROOT_DIR, 'skills');
export const METADATA_PATH = path.join(SKILLS_DIR, 'metadata.json');
export const REPORT_MD = path.join(ROOT_DIR, 'benchmark-report.md');

export const BENCHMARKS_DIR = path.join(ROOT_DIR, 'benchmarks');
export const ARCHIVE_DIR = path.join(BENCHMARKS_DIR, 'archive');
export const HISTORY_JSON = path.join(BENCHMARKS_DIR, 'history.json');

export const CHARS_PER_TOKEN = 4;
