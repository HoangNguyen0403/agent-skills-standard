# Code Review Checklist & Best Practices

## 🧠 Reviewer Mindset (Best Practices)

- **Principal Engineer Persona**: Focus on "Why" and "What If", not just "What".
- **Constructive Tone**:
  - _Bad_: "Change this variable name."
  - _Good_: "What do you think about naming this `isFetching` to clarify it's a boolean?"
- **Questions > Commands**: Ask questions to provoke thought (e.g., "Does this handle the null case?").
- **Appreciation**: explicitly commend clever solutions or clean logic.
- **Reference**: Link to official docs or project specs when enforcing rules.

## ✅ Review Checklist

### 1. 🛡 Security (P0)

- **Injection**: Are inputs sanitized (SQL, XSS, Cmd)?
- **Auth**: Are correct guards/policies applied?
- **Secrets**: Any hardcoded keys/tokens?
- **Data Exposure**: Is sensitive data (PII) masked in logs/responses?

### 2. ⚡ Performance & Scalability (P1)

- **Complexity**: Is the algorithm O(n) or O(n^2)? Can it be O(1)?
- **Database**: N+1 queries? Missing indexes?
- **Memory**: potential leaks (listeners not disposed)?
- **Network**: Over-fetching data? Missing pagination?

### 3. 🎯 Functionality & Logic (P1)

- **Correctness**: Does it meet the requirements?
- **Edge Cases**: Nulls, empty lists, network errors handled?
- **Concurrency**: Race conditions? Thread safety?

### 4. 🧹 Clean Code & Architecture (P2)

- **DRY**: Logic repeated? Extract to utility.
- **SOLID**: Single Responsibility violated? High coupling?
- **Naming**: Do names reveal intent? (`d` vs `daysInMonth`).
- **Tests**: Are complex paths tested? (Not just coverage padding).

### 5. 📉 Housekeeping (Nitpicks)

- **Typos**: Comments/Strings errors.
- **Formatting**: (Ideally handled by linter/formatter, ignore unless critical).
- **Dead Code**: Unused imports/variables.
