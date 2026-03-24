# Implementation Examples

## Compound Index Following ESR Rule

```javascript
// Create compound index following ESR rule
db.orders.createIndex({ status: 1, date: 1, price: 1 });

// Query leveraging the index
db.orders.find({ status: "active" }).sort({ date: 1 }).hint({ status: 1, date: 1, price: 1 });
```

## Cursor-Based Pagination

```javascript
// Cursor-based pagination (efficient)
const lastId = ObjectId("64a7...");
db.products.find({ _id: { $gt: lastId } }).sort({ _id: 1 }).limit(20);
```
