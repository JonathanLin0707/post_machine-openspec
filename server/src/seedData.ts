import Database from 'better-sqlite3'

export const testProducts = [
  { name: '蘋果', price: 89, barcode: '90001', category: '水果', stock: 50 },
  { name: '香蕉', price: 45, barcode: '90002', category: '水果', stock: 80 },
  { name: '牛奶', price: 65, barcode: '90003', category: '乳製品', stock: 30 },
  { name: '麵包', price: 35, barcode: '90004', category: '烘焙', stock: 20 },
  { name: '雞蛋', price: 78, barcode: '90005', category: '乳製品', stock: 100 },
  { name: '咖啡', price: 120, barcode: '90006', category: '飲料', stock: 40 },
  { name: '茶葉', price: 95, barcode: '90007', category: '飲料', stock: 35 },
  { name: '餅乾', price: 48, barcode: '90008', category: '零食', stock: 60 },
  { name: '薯片', price: 55, barcode: '90009', category: '零食', stock: 70 },
  { name: '香檳酒', price: 280, barcode: '90010', category: '酒精飲料', stock: 15 },
]

export function seedTestData(db: Database.Database): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Disable foreign key constraints for testing
      db.exec('PRAGMA foreign_keys = OFF')
      
      // Clear existing test data
      db.exec(`DELETE FROM products`)
      
      // Re-enable foreign key constraints
      db.exec('PRAGMA foreign_keys = ON')
      
      // Insert test products
      const insert = db.prepare(`
        INSERT INTO products (name, price, barcode, category, stock)
        VALUES (?, ?, ?, ?, ?)
      `)
      
      testProducts.forEach(product => {
        insert.run(product.name, product.price, product.barcode, product.category, product.stock)
      })
      
      console.log('Test data seeded successfully')
      resolve()
    } catch (error) {
      console.error('Error seeding test data:', error)
      reject(error)
    }
  })
}
