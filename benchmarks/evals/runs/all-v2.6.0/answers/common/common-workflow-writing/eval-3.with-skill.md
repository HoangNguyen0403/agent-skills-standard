Do not keep a 15-line inline code block in `SKILL.md`.

Per the standard, inline code blocks must stay at 10 lines or fewer. Update it like this:

- Replace the long inline example with a short template or minimal snippet.
- Move the full 15-line configuration example into a `references/` file.
- Keep `SKILL.md` focused on the rule, trigger, and usage pattern.

Recommended rewrite pattern:

```md
Use this configuration shape:

```yaml
key: <value>
section:
  nested_key: <value>
```

Full example: `references/example-config.yaml`
```

This preserves the contract in `SKILL.md` while offloading bulky example data to a reference file.

