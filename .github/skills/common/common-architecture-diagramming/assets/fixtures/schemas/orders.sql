CREATE TABLE customers (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  name text
);

CREATE TABLE orders (
  id uuid PRIMARY KEY,
  customer_id uuid NOT NULL REFERENCES customers(id),
  status text NOT NULL,
  placed_at timestamptz NOT NULL
);

CREATE TABLE order_items (
  order_id uuid NOT NULL,
  sku text NOT NULL,
  qty integer NOT NULL,
  PRIMARY KEY (order_id, sku),
  FOREIGN KEY (order_id) REFERENCES orders (id)
);
