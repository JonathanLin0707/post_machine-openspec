import initSqlJs from 'sql.js'
import path from 'path'
import fs from 'fs'

let db: SQL | null = null
let sqlJs: any = null

export const initDatabase = async () => {
  if (db) return db
  
  sqlJs = await initSqlJs()
  
  // Load existing database or create new one
  const dbPath = process.env.DATABASE_PATH || './data/grocery.db'
  const dbDir = path.dirname(dbPath)
  
  // Ensure database directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }
  
  // Check if database file exists
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new sqlJs.Database(fileBuffer)
  } else {
    db = new sqlJs.Database()
  }
  
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON')
  
  initSchema()
  
  return db
}

export const initSchema = () => {
  if (!db) throw new Error('Database not initialized')
  
  // Products table
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      price REAL NOT NULL,
      barcode TEXT UNIQUE,
      category TEXT,
      stock INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Orders table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total REAL NOT NULL,
      tax REAL NOT NULL DEFAULT 0,
      payment_method TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Order items table
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
    )
  `)

  // Create indexes
  db.run(`CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)`)

  console.log('Database schema initialized successfully')
}

export const saveDatabase = () => {
  if (!db || !sqlJs) return
  
  const data = db.export()
  const buffer = Buffer.from(data)
  
  const dbPath = process.env.DATABASE_PATH || './data/grocery.db'
  fs.writeFileSync(dbPath, buffer)
}

export const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export default {
  initDatabase,
  initSchema,
  saveDatabase,
  getDb,
}
