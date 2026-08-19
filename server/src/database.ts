import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbPath = process.env.DATABASE_PATH || './data/grocery.db'
const dbDir = path.dirname(dbPath)

let db: Database.Database | null = null

export function initDatabase(): Database.Database {
  if (db) return db
  
  // Ensure database directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  
  // Create or load database
  db = new Database(dbPath)
  
  // Enable foreign keys and WAL mode for better concurrency
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
  `)
  
  initSchema()
  
  console.log('Database initialized successfully')
  return db
}

export function initSchema(): void {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.')
  
  // Products table
  db.exec(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    price REAL NOT NULL,
    barcode TEXT UNIQUE,
    category TEXT,
    stock INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)

  // Orders table
  db.exec(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total REAL NOT NULL,
    tax REAL NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)

  // Order items table
  db.exec(`CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
  )`)

  // Create indexes
  db.exec('CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)')

  console.log('Database schema initialized successfully')
}

export function getDb(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function saveDatabase(): void {
  // better-sqlite3 automatically persists to disk, no need to manually export
  console.log('Database saved automatically (better-sqlite3 handles persistence)')
}

export default {
  initDatabase,
  initSchema,
  saveDatabase,
  getDb,
}
