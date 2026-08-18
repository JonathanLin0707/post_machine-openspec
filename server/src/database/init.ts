import { getDb, initSchema } from './database'
import { testProducts } from './seedData'

const db = getDb()

// Initialize schema
initSchema()

// Insert test products
console.log('Inserting test products...')
for (const product of testProducts) {
  try {
    db.prepare(
      `INSERT OR IGNORE INTO products (name, price, barcode, category, stock) 
       VALUES (?, ?, ?, ?, ?)`
    ).run(product.name, product.price, product.barcode, product.category, product.stock)
  } catch (error: any) {
    // Ignore duplicates
  }
}

console.log('Test products inserted successfully!')
console.log('Database is ready to use.')
