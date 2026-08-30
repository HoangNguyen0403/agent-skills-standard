# SAP HANA Patterns & Query Builders

## 1. Safe Dynamic `IN (...)` Parameter Building

SAP HANA uses `?` positional parameters. When filtering by dynamic slices (e.g. sales organizations, IDs, material codes), generate exact placeholder strings:

```go
func BuildInClause(count int) string {
    if count <= 0 {
        return ""
    }
    return strings.Repeat("?,", count)[:count*2-1] // e.g. "?,?,?"
}
```

### Parameter Chunking (≤ 1,000 items)

When querying large slices, chunk requests to prevent SAP HANA driver buffer overflow:

```go
func QueryInBatches[T any](ctx context.Context, db *sql.DB, items []string, batchSize int, queryFn func(batch []string) ([]T, error)) ([]T, error) {
    if batchSize <= 0 || batchSize > 1000 {
        batchSize = 1000
    }
    var results []T
    for i := 0; i < len(items); i += batchSize {
        end := i + batchSize
        if end > len(items) {
            end = len(items)
        }
        batch := items[i:end]
        res, err := queryFn(batch)
        if err != nil {
            return nil, err
        }
        results = append(results, res...)
    }
    return results, nil
}
```

---

## 2. Dynamic WHERE Clause Construction

Never concatenate raw inputs into query strings. Use a structured builder pattern:

```go
type QueryBuilder struct {
    clauses []string
    args    []any
}

func (qb *QueryBuilder) Where(condition string, arg any) {
    qb.clauses = append(qb.clauses, condition)
    qb.args = append(qb.args, arg)
}

func (qb *QueryBuilder) WhereIn(column string, items []string) {
    if len(items) == 0 {
        return
    }
    placeholders := strings.Repeat("?,", len(items))
    placeholders = placeholders[:len(placeholders)-1]
    qb.clauses = append(qb.clauses, fmt.Sprintf("%s IN (%s)", column, placeholders))
    for _, item := range items {
        qb.args = append(qb.args, item)
    }
}

func (qb *QueryBuilder) Build() (string, []any) {
    if len(qb.clauses) == 0 {
        return "", qb.args
    }
    return "WHERE " + strings.Join(qb.clauses, " AND "), qb.args
}
```

---

## 3. Streaming Query Results (Memory Efficiency)

Avoid loading millions of columnar records into memory at once:

```go
func FetchProductsStream(ctx context.Context, db *sql.DB, query string, args ...any) ([]*Product, error) {
    rows, err := db.QueryContext(ctx, query, args...)
    if err != nil {
        return nil, fmt.Errorf("query products: %w", err)
    }
    defer rows.Close()

    var products []*Product
    for rows.Next() {
        var p Product
        if err := rows.Scan(&p.ID, &p.Code, &p.Name, &p.Status); err != nil {
            return nil, fmt.Errorf("scan product: %w", err)
        }
        products = append(products, &p)
    }
    if err := rows.Err(); err != nil {
        return nil, fmt.Errorf("rows iteration: %w", err)
    }
    return products, nil
}
```
