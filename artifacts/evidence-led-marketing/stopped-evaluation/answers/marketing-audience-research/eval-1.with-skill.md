To report workflow problems gathered from GitHub issue search queries and blog comments prior to conducting 1-on-1 interviews, follow the **`marketing-audience-research`** protocol:

---

### 1. Label Findings as Proxy Assumptions (`AC-02`)
* **Explicit Tagging:** Because primary 1-on-1 customer interviews are absent and data relies on indirect channels (issue trackers and comments), label all audience beliefs and pain points as:
  ```yaml
  assumption: proxy_inferred
  status: proposal
  ```
* **Distinction from Verified Findings:** Never report these observations as verified customer findings or established facts. Present them as unvalidated working hypotheses to be tested during subsequent primary interviews.

---

### 2. Formulate Sourced, Falsifiable Problem Statements
* **Direct Provenance:** Anchor every identified friction point directly to verifiable, public source statements (e.g., specific public GitHub issue URLs or public comment threads) using explicit source references (`SRC` IDs/links).
* **No Fabricated Quotes or Personas:** Do not construct synthetic quotes, composite developer personas, or unverified statistical generalizations (e.g., avoid claiming "X% of developers experience this").
* **Falsifiable Framing:** Frame problems as falsifiable statements tied to specific tasks/workflows rather than sweeping claims about "all developers."

---

### 3. Document Sample Limitations and Channel Bias (`AC-17`)
Include an explicit **`sample_limitations`** section disclosing:
* **Source Channel Bias:** Note that GitHub issues and blog comments skew heavily toward vocal outliers, developers hitting edge cases, or users experiencing acute blockers, rather than representing typical daily usage.
* **Underrepresented Segments:** Identify developer cohorts absent from public GitHub threads or blog comments (e.g., enterprise developers behind firewalls, non-English speakers, or passive users).
* **Sample Size & Reach:** State exact volumes and boundaries of queries and threads analyzed.

---

### 4. Preserve Contradictory Workflows (`AC-01`)
* Retain dissenting workflows and conflicting feedback with explicit scope boundaries. 
* Do not average out discrepancies or force false consensus across different developer environments, tooling stacks, or project scales.
