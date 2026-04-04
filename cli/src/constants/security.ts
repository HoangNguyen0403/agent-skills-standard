/**
 * Centralized patterns for detecting and sanitizing prompt injection.
 * Shared between the CLI and CI scanning scripts.
 */

export const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(?:all\s+|previous\s+|prior\s+)*(?:instructions?|rules?|guidance)/gi,
  /you\s+(?:must|should|shall|will)\s+(?:now|immediately)\b/gi,
  /^(?:system|user|assistant)\s*:/gim,
  /(?:^|\n)\s*-{3,}\s*(?:\n|$)/g,
  /<(?:script|iframe|style)[^>]*\s*>[\s\S]*?<\/(?:script|iframe|style)[^>]*\s*>/gi,
];
