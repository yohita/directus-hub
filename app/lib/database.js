import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database is in the project root's data directory
const dbPath = process.env.DB_PATH || path.join(path.dirname(path.dirname(__dirname)), 'data', 'directuscloud.db');
const dbDir = path.dirname(dbPath);

// Ensure data directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
const createTables = () => {
  // Instances table - added mcp_enabled and api_key
  db.exec(`
    CREATE TABLE IF NOT EXISTS instances (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subdomain TEXT UNIQUE NOT NULL,
      port INTEGER UNIQUE NOT NULL,
      custom_domain TEXT UNIQUE,
      database_type TEXT NOT NULL DEFAULT 'sqlite',
      database_host TEXT,
      database_port INTEGER,
      database_name TEXT,
      database_user TEXT,
      database_password TEXT,
      admin_email TEXT,
      admin_password TEXT,
      api_key TEXT,
      mcp_enabled BOOLEAN DEFAULT 0,
      status TEXT DEFAULT 'stopped',
      auto_reload BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migration for custom_domain if it doesn't exist
  try {
    db.prepare('SELECT custom_domain FROM instances LIMIT 1').get();
  } catch (error) {
    if (error.message.includes('no such column')) {
      console.log('Migrating: Adding custom_domain column to instances table');
      db.exec('ALTER TABLE instances ADD COLUMN custom_domain TEXT');
      db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_domain ON instances(custom_domain) WHERE custom_domain IS NOT NULL');
    }
  }

  // Settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log('✓ Database tables initialized');
};

// Initialize tables
createTables();

export default db;
