# PostgreSQL vs MongoDB: A Best Practices Comparison

## Core Philosophy

| Feature          | PostgreSQL (SQL)                                                                 | MongoDB (NoSQL)                                                                                      |
| :--------------- | :------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- |
| **Data Model**   | **Relational (Rows/Tables)**. Rigid schema. Normalize data to reduce redundancy. | **Document (JSON/BSON)**. Flexible schema. Denormalize (Embed) for read locality.                    |
| **Scaling**      | **Vertical** (Bigger machine). Read replicas for scaling reads.                  | **Horizontal** (Sharding). Built-in distribution of data across clusters.                            |
| **Transactions** | **ACID** (Atomic, Consistent, Isolated, Durable). Multi-row defaults.            | **BASE** (Basically Available, Soft state, Eventual consistency). ACID available but costly (v4.0+). |
| **Joins**        | **Powerful**. `JOIN` is efficient and expected.                                  | **Avoid**. `$lookup` exists but is slow. Design schema to _avoid_ joins.                             |

## Feature Mapping

| PostgreSQL Concept | MongoDB Equivalent              | Best Practice Shift                                                                                      |
| :----------------- | :------------------------------ | :------------------------------------------------------------------------------------------------------- |
| **Table**          | **Collection**                  | -                                                                                                        |
| **Row**            | **Document**                    | Documents can have different fields (Polymorphism).                                                      |
| **Column**         | **Field**                       | Fields can be arrays or objects (Embedded).                                                              |
| **Join**           | **Embedding** / `$lookup`       | **Postgres**: Join tables. **Mongo**: Embed if 1:Few; Reference if 1:Many.                               |
| **Foreign Key**    | **ObjectId** / Reference        | **Postgres**: DB enforces constraint. **Mongo**: App application logic usually enforces it.              |
| **Transaction**    | **Transaction / Atomic Update** | **Postgres**: Use for everything. **Mongo**: Use atomic operators (`$inc`, `$set`) on single docs first. |

## When to use which?

### Choose PostgreSQL when:\*\*

- Requirements are strict (Financial, Billing).
- Data structure is highly relational and stable.
- Complex queries / Reporting is the primary use case.

### Choose MongoDB when:\*\*

- Data structure is evolving or unstructured (Content Management, Catalogs).
- High write throughput is needed (IoT, Logs).
- You need deep nesting/objects as first-class citizens.
