/**
 * Public CommonJS library entry point: `agent-skills-standard-mcp/retrospective`.
 *
 * Local session retrospectives are owner-local. Nothing here returns report
 * text or artifact paths through a hosted tool channel; adapters are separate
 * packages that call these functions from a human-initiated action.
 *
 * This surface is intentionally bounded: read/delete projections and the
 * consent-gated preparation pipeline. Low-level store mutators, claims,
 * locks, layout helpers, and `collectEvidence` are internal modules; tests
 * import them directly and they are not a supported entry point.
 *
 * This module has no side effects and must never import `./index` (the MCP
 * server entry point starts a transport).
 */

export {
  DEFAULT_LIMITS,
  localManifestSchema,
  nodeKeySchema,
  prepareRequestSchema,
  sameNodeKey,
  nodeKeyId,
  type Analysis,
  type Analyzer,
  type ArtifactReceipt,
  type Checkpoint,
  type Coverage,
  type CriterionState,
  type Disposition,
  type EvidenceLimits,
  type EvidencePacket,
  type EvidenceSource,
  type Finding,
  type Invitation,
  type LocalManifest,
  type NodeKey,
  type PrepareRequest,
  type Proposal,
  type SafeEvent,
  type SourceRef,
} from "./retrospective/contracts";

export {
  loadLocalManifest,
  createManifestEvidenceSource,
  type NativeReaderLimits,
  type NativeSourceOptions,
} from "./retrospective/native-reader";

export {
  analyzeLocal,
  localRules,
  RetrospectiveError,
  CRITERIA,
  MAX_SOURCES_PER_FINDING,
  RULE_CATALOG,
  CLAIM_ORDER,
  type ClaimCode,
  type RuleDefinition,
} from "./retrospective/rules";

export {
  prepareLocal,
  PREPARE_LIMITS,
  type PrepareMode,
  type PrepareOptions,
} from "./retrospective/prepare";

export {
  ARTIFACT_FILES,
  INDEX_PAGE_SIZE,
  STORE_LIMITS,
  StoreError,
  deleteSession,
  listPublished,
  resolveArtifact,
  type ArtifactKind,
  type ArtifactStatus,
  type DeleteResult,
  type PublishedEntry,
  type PublishedPage,
  type ResolvedArtifact,
} from "./retrospective/store";

export {
  applyInvitationAction,
  readInvitation,
  recordCheckpoint,
  transition,
  type CheckpointDispositionResult,
  type InvitationAction,
  type InvitationEvent,
} from "./retrospective/checkpoint";

export { EvidenceLimitError } from "./retrospective/budget";
