Learning-log entry:

- Mistake: Used a React class component despite the project's required modern function-component pattern.
- Impact: The implementation violated the project standard and increased inconsistency and maintenance cost.
- Correction: Convert the component to a function component using hooks where state or lifecycle behavior is needed.
- Prevention: Check the applicable frontend conventions before implementation and run the skill-violation audit before handoff.
