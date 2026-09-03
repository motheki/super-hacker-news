CREATE TABLE items (
  id INTEGER PRIMARY KEY,
  parent_id INTEGER,
  root_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  observed_at INTEGER NOT NULL
);

CREATE INDEX items_parent_idx ON items(parent_id);
CREATE INDEX items_root_idx ON items(root_id);

CREATE TABLE feeds (
  name TEXT PRIMARY KEY,
  ids TEXT NOT NULL,
  observed_at INTEGER NOT NULL
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL,
  official_count INTEGER NOT NULL,
  reachable_count INTEGER NOT NULL,
  observed_at INTEGER NOT NULL
);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  observed_at INTEGER NOT NULL
);
