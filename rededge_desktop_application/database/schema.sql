-- Camera connection profiles
CREATE TABLE IF NOT EXISTS camera_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  protocol TEXT NOT NULL DEFAULT 'http',
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  path_prefix TEXT DEFAULT '',
  is_active INTEGER DEFAULT 0,
  last_ok_at TEXT,
  consecutive_failures INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Application settings (key-value store)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Download queue
CREATE TABLE IF NOT EXISTS download_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  camera_profile_id INTEGER NOT NULL,
  remote_path TEXT NOT NULL,
  local_path TEXT NOT NULL,
  status TEXT NOT NULL, -- pending, downloading, completed, failed, paused
  total_bytes INTEGER DEFAULT 0,
  downloaded_bytes INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (camera_profile_id) REFERENCES camera_profiles(id)
);

-- Capture jobs history
CREATE TABLE IF NOT EXISTS capture_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL, -- manual, timer_camera
  interval_sec INTEGER,
  status TEXT NOT NULL, -- idle, running, stopped, error
  last_capture_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- License state (single row table)
CREATE TABLE IF NOT EXISTS license_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  status TEXT NOT NULL, -- trial, activated, expired
  activation_code TEXT,
  device_fingerprint TEXT NOT NULL,
  last_check_at TEXT,
  expiry_at TEXT,
  user_json TEXT,
  raw_payload TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Insert default settings
INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES
  ('download_directory', json_quote(''), datetime('now')),
  ('preview_refresh_rate', '0.5', datetime('now')),
  ('status_refresh_rate', '3', datetime('now')),
  ('request_timeout', '30000', datetime('now')),
  ('enable_logging', 'true', datetime('now'));

-- Initialize trial license on first run
INSERT OR IGNORE INTO license_state (
  id, status, device_fingerprint, created_at, updated_at
) VALUES (
  1, 'trial', '', datetime('now'), datetime('now')
);
