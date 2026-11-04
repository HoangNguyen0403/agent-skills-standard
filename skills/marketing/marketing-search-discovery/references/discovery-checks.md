# Discoverability Checks Reference

## 1. Classification of Discoverability Checks

All discoverability checks are partitioned into two distinct categories:

```
+--------------------------------------------------------------------------+
| CATEGORY A: Offline Deterministic Checks (Runnable on Localhost)         |
| - Semantic heading hierarchy (single <h1>, sequential <h2>, <h3>)       |
| - Meta title tag (present, non-empty, <=60 chars)                        |
| - Meta description tag (present, non-empty, <=160 chars)                 |
| - Canonical URL format template                                          |
| - OpenGraph tags (og:title, og:description, og:image, og:type)           |
| - Twitter Card tags (twitter:card, twitter:title, twitter:description)   |
| - robots.txt syntax and user-agent disallow/allow directives             |
| - sitemap.xml structure and valid date/loc schema                       |
| - JSON-LD Schema.org structured data validity                            |
+--------------------------------------------------------------------------+
                                    |
                                    v
+--------------------------------------------------------------------------+
| CATEGORY B: Deployment-Dependent Checks (Requires Verified Live Domain)  |
| - Search engine indexation status (Google, Bing Search Console)          |
| - Actual Search Engine Result Page (SERP) ranking position               |
| - External backlink profile and domain authority                         |
| - Live crawler reachability and Core Web Vitals field data               |
| - AI model citations (ChatGPT, Perplexity, Gemini)                       |
| *RULE: On localhost, Category B checks MUST be reported as unavailable.*|
+--------------------------------------------------------------------------+
```

## 2. Audit Output Schema

```json
{
  "audit_id": "disc-audit-20261025-01",
  "target_url": "http://localhost:3000",
  "environment": "localhost",
  "context_revision": "ctx-rev-20261025-01",
  "state": "prepared",
  "deterministic_checks": [
    {
      "check_id": "heading_hierarchy",
      "status": "passed",
      "details": "Single h1 element detected; 4 h2 subheadings cleanly ordered."
    },
    {
      "check_id": "meta_description",
      "status": "passed",
      "details": "Description present (142 characters)."
    },
    {
      "check_id": "json_ld_schema",
      "status": "passed",
      "details": "Valid SoftwareApplication schema detected."
    }
  ],
  "deployment_checks": [
    {
      "check_id": "search_engine_indexing",
      "status": "unavailable",
      "reason": "localhost_indexing_unavailable",
      "details": "Cannot verify search engine indexation on local server."
    },
    {
      "check_id": "live_serp_ranking",
      "status": "unavailable",
      "reason": "deployment_evidence_absent",
      "details": "Live search ranking requires verified public domain telemetry."
    }
  ],
  "recommendations": [
    "Ensure robots.txt disallow rules do not block /docs/ on deployment.",
    "Add explicit JSON-LD license property matching repository LICENSE."
  ]
}
```
