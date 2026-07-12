Learning-log entry:

- Mistake: Implemented an API endpoint without loading the required security skill.
- Impact: Security-specific requirements and review checks may have been missed before code was written.
- Correction: Load the security guidance, review the endpoint for authentication, authorization, input validation, data exposure, and abuse controls, then add or update the relevant tests.
- Prevention: Make skill resolution a pre-write gate: identify the file and request keywords, load all matched skills, and audit compliance before declaring the work complete.
