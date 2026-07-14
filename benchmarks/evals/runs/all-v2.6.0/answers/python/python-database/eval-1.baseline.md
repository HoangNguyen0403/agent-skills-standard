Do not interpolate query values with an f-string, even when they are currently internal. Use a parameterized query so the database driver handles quoting and typing:

```python
cursor.execute(
    "SELECT * FROM accounts WHERE account_id = %s",
    (account_id,),
)
```

If a dynamic identifier such as a table or column name is unavoidable, choose it from an allowlist and use the driver's identifier-quoting API; placeholders are for values, not identifiers. This keeps the code safe if an internal value later comes from a less-trusted path and avoids malformed SQL.
