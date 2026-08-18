import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbPath = path.join(
  process.cwd(),
  'server',
  'database.db'
)

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) {
    const dir = path.dirname(dbPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    db = new Database(dbPath)
    
    // Enable foreign keys
    db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
    `)
  }
  return db
}

export function initSchema(): void {
  const db = getDb()
  
  // Create products table
  db.exec(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    barcode TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    stock INTEGER DEFAULT 0,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
  
  // Create orders table
  db.exec(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    total REAL NOT NULL,
    tax REAL NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`)
  
  // Create order_items table
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
  db.exec(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)`)
  db.exec(`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`)
  
  console.log('Database schema initialized successfully!')
}

export function closeDb(): void {
  if (db) {
    db.close()
    db = undefined as unknown as Database.Database
  }
}
