CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('viewer','analyst','admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS records (
  id SERIAL PRIMARY KEY,
  amount NUMERIC NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('income','expense')),
  category TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  resource_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);