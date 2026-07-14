Write it as an atomic, testable AC:

**AC — VN tender tag visibility**

Given a user in Vietnam (`VN`) is using `{APP_NAME}`, when they view a tender that is available, then the system displays a tag with the exact text **“Tender Available”**.

Implied ACs:

- Users identified as `VN` can see the tag on every applicable available tender.
- The tag is not displayed for unavailable tenders.
- Non-`VN` users do not see this VN-specific tag, unless another requirement explicitly enables it.
- `{APP_NAME}` must resolve to the intended application/product name.
- The exact label, capitalization, and spacing are **“Tender Available”**.
- The story must identify the relevant tender screen/list/detail view and define how “VN user” and “available tender” are determined.
