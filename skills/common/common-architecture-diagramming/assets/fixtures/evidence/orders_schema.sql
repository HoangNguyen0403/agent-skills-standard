-- Synthetic schema source record for the component fixture.
CREATE TABLE orders (
  id UUID PRIMARY KEY,
  payment_key TEXT NOT NULL UNIQUE,
  outcome TEXT NOT NULL
);
