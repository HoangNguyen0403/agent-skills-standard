# SAP HANA Production SQL Gotchas

## 1. 🛡️ Duplicate Column Aliases on JOINs

SAP HANA and Go SQL drivers map returned columns by name. If two joined tables share column names (e.g. `id`, `code`, `name`, `status`), selecting without unique aliases will cause column collision where one table's field overwrites another.

```sql
-- BAD: Both tables have 'code' and 'status'
SELECT m.code, m.status, p.code, p.status
FROM MARA m
JOIN MARC p ON m.matnr = p.matnr;

-- GOOD: Explicit aliases ensure distinct struct mapping
SELECT
    m.matnr AS material_number,
    m.code  AS material_code,
    p.werks AS plant_code,
    p.status AS plant_status
FROM MARA m
JOIN MARC p ON m.matnr = p.matnr;
```

---

## 2. ⚡ Incompatible Datatypes in `COALESCE` & `SUBSTR`

SAP HANA strictly enforces datatype matching in built-in functions. Mismatched arguments throw `inconsistent datatype: ERROR 383`.

```sql
-- BAD: Mixing INTEGER column with STRING fallback
SELECT COALESCE(quantity, '0') FROM inventory;

-- GOOD: Use matching type or explicit cast
SELECT COALESCE(quantity, 0) FROM inventory;
SELECT COALESCE(TO_VARCHAR(quantity), 'N/A') FROM inventory;
```

For `SUBSTR`, ensure the offset and length arguments are valid integers and input is character-based:
```sql
SELECT SUBSTR(TO_VARCHAR(material_id), 1, 10) FROM products;
```

---

## 3. 📦 Parameter Limit on `IN (...)` Clauses

The SAP HANA driver and SQL parser have strict limits on statement length and parameter descriptors. Passing large lists (> 1,000 values) causes driver failures.

- **Rule**: Always partition input IDs into batches of ≤ 1,000 before constructing `IN (?)` queries.

---

## 4. 🔤 Identifier Case-Sensitivity & Quoting

In SAP HANA:
- `SELECT name FROM users` -> HANA parses as `SELECT NAME FROM USERS` (Uppercase).
- `SELECT "name" FROM "users"` -> HANA parses exactly as lowercase `"name"` from `"users"`.

If the schema was created with mixed-case quoted identifiers, all queries must quote them identically.
