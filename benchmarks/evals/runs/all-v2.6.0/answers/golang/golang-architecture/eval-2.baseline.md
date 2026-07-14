No. The domain layer should not import the DB package directly.

Keep the domain focused on business rules and define an interface there for the data it needs. Then implement that interface in the infrastructure or repository layer using the database package.

That keeps the domain independent, easier to test, and avoids coupling core logic to storage details.

