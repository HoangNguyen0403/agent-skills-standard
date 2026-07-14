Put shared contracts in a dedicated `libs/contracts` package within the monorepo: DTOs, interfaces, event schemas, and `.proto` files. Each service imports only from that package, never from a sibling service's source tree.

Version messages semantically and preserve existing field types; add optional fields for compatible evolution instead of changing a field in place. Generate gRPC clients/types from the versioned proto where appropriate, apply validation at each service boundary, and test consumer compatibility during contract changes.

