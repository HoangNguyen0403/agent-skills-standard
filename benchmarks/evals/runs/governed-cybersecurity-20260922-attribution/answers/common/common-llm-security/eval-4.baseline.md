No. A matching SHA-256 hash verifies only that the package bytes match a known reference artifact (assuming the reference is trusted). It does not grant authorization, privileges, prove the code is safe, or make the host’s ignored tool restrictions enforceable.

Safe alternative: conduct a bounded, explicitly authorized assessment in an isolated lab or staging environment, using non-destructive/read-only checks or simulated fixtures, with clear scope and approval.
