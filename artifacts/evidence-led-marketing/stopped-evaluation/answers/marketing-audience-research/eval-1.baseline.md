When reporting workflow problems based on secondary passive sources (GitHub issues, blog comments) without primary 1-on-1 developer interviews, structure the findings using the following principles:

### 1. Explicitly Label Evidence as Hypotheses and Observed Symptoms
- Frame identified workflow issues as **unvalidated problem hypotheses** or **observed friction patterns**, rather than verified root causes.
- Distinguish between **unsolicited public complaints** (what developers complain about publicly) and **actual day-to-day workflow blockers** (which often differ once observed end-to-end).

### 2. Trace and Quantify the Source Trail
- Attribute findings directly to the data source (e.g., `"Observed across N GitHub issue threads in repository X"` or `"Identified in N comments across blog posts discussing Y"`).
- Provide verbatim user quotes where appropriate to preserve authentic developer language, while clearly marking them as public commentary.
- Note frequency and recurrence indicators (e.g., upvotes, repeated mentions across distinct repos/threads) to demonstrate signal strength without overstating statistical validity.

### 3. Acknowledge Methodology Limits and Biases
Include a prominent **Methodology & Limitations** note:
- **Survivorship / Vocal Minority Bias:** Public issues and comments over-represent vocal edge cases, setup/installation hurdles, and catastrophic failures, while under-representing routine, silent friction.
- **Context Gap:** Public posts reveal symptoms and desired workarounds, but lack context on company constraints, internal tooling, team size, and end-to-end task duration.

### 4. Provide a Target Matrix for Interview Validation
Group the workflow problems into a structured verification matrix to serve as the direct agenda for upcoming 1-on-1 interviews:
- **Observed Friction / Complaint:** The symptom recorded from issues/comments.
- **Underlying Hypothesis:** The presumed workflow bottleneck causing it.
- **Validation Objective (1-on-1s):** Specific questions to test in interviews (e.g., *"How do teams actually handle this step today?", "What workaround is used, and how much time does it consume?"*).
- **Confidence Rating:** Low / Medium (pending qualitative interview confirmation).
