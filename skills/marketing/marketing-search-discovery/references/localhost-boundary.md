# Localhost Boundary & Status Reference (AC-24)

## 1. The Localhost Boundary Contract

Under PRD REQ-MKT-012 and AC-24:
> *Given localhost only and no deployed domain/indexing evidence, when search discovery runs, then deployment-dependent checks are explicitly unavailable rather than passed.*

When an agent or developer tool evaluates a website hosted on:
- `localhost` or `127.0.0.1`
- `0.0.0.0` or private subnets (`10.x.x.x`, `192.168.x.x`)
- Local filesystem static builds (`dist/`, `out/`, `build/`)
- Staging environments without public search console delegation

The evaluation engine has **zero causal evidence** regarding external search engine indexing, domain trust, or ranking position.

## 2. Standard Diagnostic Codes & Reasons

| Check Identifier | Status on Localhost | Mandatory Reason Code |
|---|---|---|
| `search_engine_indexing` | `unavailable` | `localhost_indexing_unavailable` |
| `domain_authority_ranking` | `unavailable` | `deployment_evidence_absent` |
| `backlink_verification` | `unavailable` | `deployment_evidence_absent` |
| `crawler_fetch_status` | `unavailable` | `localhost_indexing_unavailable` |
| `ai_citation_presence` | `unavailable` | `deployment_evidence_absent` |

## 3. Anti-Patterns & Prohibited Claims

1. **Never Mark "Passed" for Indexing on Localhost**:
   - Marking external indexing checks as `passed`, `green`, or `100%` on a local development server falsifies verification evidence and violates AC-24.
2. **Never Fabricate Ranking Positions (SERP)**:
   - Claiming "ranked #1 for target search query" without authenticated, dated search console receipts is strictly prohibited.
3. **Never Convert Technical Hygiene into Traffic Guarantees**:
   - Clean meta tags and valid JSON-LD schemas improve discoverability hygiene; they do NOT guarantee organic traffic volume or top-ten search rankings.
