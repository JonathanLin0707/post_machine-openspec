import { Router, Request, Response } from 'express'
import { getDb } from '../database'

const router = Router()

// GET /api/products - Get all products with search and filter
router.get('/', (req: Request, res: Response) => {
  const { search, category } = req.query
  const db = getDb()

  let products: any[] = []
  
  try {
    const data = db.exec('SELECT * FROM products')
    if (data.length > 0 && data[0].values) {
      products = data[0].values.map(row => ({
        id: row[0],
        name: row[1],
        price: row[2],
        barcode: row[3],
        category: row[4],
        stock: row[5],
        image_url: row[6] || null,
        created_at: row[7] || null,
        updated_at: row[8] || null
      }))
    }
  } catch (error) {
    console.error('Error fetching products:', error)
  }

  let filtered = products

  if (search) {
    const searchPattern = `%${String(search)}%`
    filtered = filtered.filter(
      (p) =>
        p.name.toLowerCase().includes(String(search).toLowerCase()) ||
        (p.barcode && String(p.barcode).includes(String(search)))
    )
  }

  if (category) {
    filtered = filtered.filter((p) => p.category === category)
  }

  res.json(filtered)
})

// GET /api/products/:id - Get single product
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb()
  
  try {
    const data = db.exec(`SELECT * FROM products WHERE id = ?`, [req.params.id])
    if (data.length > 0 && data[0].values && data[0].values.length > 0) {
      const row = data[0].values[0]
      res.json({
        id: row[0],
        name: row[1],
        price: row[2],
        barcode: row[3],
        category: row[4],
        stock: row[5],
        image_url: row[6] || null,
        created_at: row[7] || null,
        updated_at: row[8] || null
      })
    } else {
      res.status(404).json({ error: 'Product not found' })
    }
  } catch (error) {
    console.error('Error fetching product:', error)
    res.status(500).json({ error: 'Failed to fetch product' })
  }
})

// POST /api/products - Create new product
router.post('/', (req: Request, res: Response) => {
  const db = getDb()
  const { name, price, barcode, category, stock, image_url } = req.body

  // Validation
  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' })
  }

  if (price <= 0) {
    return res.status(400).json({ error: 'Price must be greater than 0' })
  }

  try {
    const result = db.run(
      `INSERT INTO products (name, price, barcode, category, stock, image_url) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, price, barcode || null, category || null, stock || 0, image_url || null]
    )

    const id = result.lastInsertRowid
    const data = db.exec(`SELECT * FROM products WHERE id = ?`, [id])
    
    if (data.length > 0 && data[0].values && data[0].values.length > 0) {
      const row = data[0].values[0]
      res.status(201).json({
        id: row[0],
        name: row[1],
        price: row[2],
        barcode: row[3],
        category: row[4],
        stock: row[5],
        image_url: row[6] || null,
        created_at: row[7] || null,
        updated_at: row[8] || null
      })
    } else {
      res.status(500).json({ error: 'Failed to create product' })
    }
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Product name or barcode already exists' })
    }
    res.status(500).json({ error: 'Failed to create product' })
  }
})

// POST /api/products/cart - Add product to cart (decrease stock)
router.post('/cart', (req: Request, res: Response) => {
  const db = getDb()
  const { productId, quantity } = req.body

  if (!productId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'Product ID and positive quantity are required' })
  }

  try {
    // Decrease stock
    const result = db.run(
      `UPDATE products 
       SET stock = stock - ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND stock >= ?`,
      [quantity, productId, quantity]
    )

    if (result.changes === 0) {
      return res.status(400).json({ error: 'Insufficient stock' })
    }

    // Get updated product
    const data = db.exec(`SELECT * FROM products WHERE id = ?`, [productId])
    if (data.length > 0 && data[0].values && data[0].values.length > 0) {
      const row = data[0].values[0]
      res.json({
        id: row[0],
        name: row[1],
        price: row[2],
        barcode: row[3],
        category: row[4],
        stock: row[5],
        image_url: row[6] || null,
        created_at: row[7] || null,
        updated_at: row[8] || null
      })
    } else {
      res.status(500).json({ error: 'Failed to update stock' })
    }
  } catch (error) {
    if (error.message.includes('FOREIGN KEY constraint failed')) {
      return res.status(404).json({ error: 'Product not found' })
    }
    res.status(500).json({ error: 'Failed to update stock' })
  }
})

// PUT /api/products/:id - Update product
router.put('/:id', (req: Request, res: Response) => {
  const db = getDb()
  const { name, price, barcode, category, stock, image_url } = req.body

  // Check if product exists
  try {
    const data = db.exec(`SELECT * FROM products WHERE id = ?`, [req.params.id])
    if (!data.length || !data[0].values || data[0].values.length === 0) {
      return res.status(404).json({ error: 'Product not found' })
    }
    
    const existing = data[0].values[0] as any

    // Validation for name uniqueness (excluding current product)
    if (name && name !== existing.name) {
      const duplicateData = db.exec(`SELECT * FROM products WHERE name = ? AND id != ?`, [name, req.params.id])
      if (duplicateData.length > 0 && duplicateData[0].values && duplicateData[0].values.length > 0) {
        return res.status(409).json({ error: 'Product name already exists' })
      }
    }

    // Validation for barcode uniqueness (excluding current product)
    if (barcode && barcode !== existing.barcode) {
      const duplicateData = db.exec(`SELECT * FROM products WHERE barcode = ? AND id != ?`, [barcode, req.params.id])
      if (duplicateData.length > 0 && duplicateData[0].values && duplicateData[0].values.length > 0) {
        return res.status(409).json({ error: 'Barcode already exists' })
      }
    }

    if (price && price <= 0) {
      return res.status(400).json({ error: 'Price must be greater than 0' })
    }

    const result = db.run(`
      UPDATE products 
      SET name = ?, price = ?, barcode = ?, category = ?, stock = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      name || existing.name,
      price ?? existing.price,
      barcode ?? existing.barcode,
      category ?? existing.category,
      stock ?? existing.stock,
      image_url ?? existing.image_url,
      req.params.id
    ])

    const updatedData = db.exec(`SELECT * FROM products WHERE id = ?`, [req.params.id])
    if (updatedData.length > 0 && updatedData[0].values && updatedData[0].values.length > 0) {
      const row = updatedData[0].values[0]
      res.json({
        id: row[0],
        name: row[1],
        price: row[2],
        barcode: row[3],
        category: row[4],
        stock: row[5],
        image_url: row[6] || null,
        created_at: row[7] || null,
        updated_at: row[8] || null
      })
    } else {
      res.status(500).json({ error: 'Failed to update product' })
    }
  } catch (error) {
    console.error('Error updating product:', error)
    res.status(500).json({ error: 'Failed to update product' })
  }
})

// DELETE /api/products/:id - Delete product
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDb()
  
  // Check if product exists
  try {
    const data = db.exec(`SELECT * FROM products WHERE id = ?`, [req.params.id])
    if (!data.length || !data[0].values || data[0].values.length === 0) {
      return res.status(404).json({ error: 'Product not found' })
    }

    db.run('DELETE FROM products WHERE id = ?', [req.params.id])
    res.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Error deleting product:', error)
    res.status(500).json({ error: 'Failed to delete product' })
  }
})

export default router
