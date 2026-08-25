import { Router, Request, Response } from 'express'
import { initDatabase, getDb } from '../database.js'
import { Product } from '../../shared/types.js'

initDatabase()
const db = getDb()

const router = Router()

// Prepared statements for products
const getAllProducts = db.prepare('SELECT * FROM products')
const getProductById = db.prepare('SELECT * FROM products WHERE id = ?')
const createProduct = db.prepare(`INSERT INTO products (name, price, barcode, category, stock, image_url) 
                                  VALUES (?, ?, ?, ?, ?, ?)`)
const updateProduct = db.prepare(`UPDATE products 
                                   SET name = ?, price = ?, barcode = ?, category = ?, stock = ?, image_url = ?, updated_at = CURRENT_TIMESTAMP
                                   WHERE id = ?`)
const deleteProduct = db.prepare('DELETE FROM products WHERE id = ?')

// GET /api/products - Get all products with search and filter
router.get('/', (req: Request, res: Response) => {
  const { search, category } = req.query
  const products: Product[] = []

  try {
    const rows = getAllProducts.all() as Product[]
    rows.forEach((row) => {
      products.push({
        id: String(row.id),
        name: row.name,
        price: Number(row.price),
        barcode: row.barcode || null,
        category: row.category || null,
        stock: Number(row.stock),
        image_url: row.image_url || null,
        created_at: row.created_at || null,
        updated_at: row.updated_at || null
      })
    })
  } catch (error) {
    console.error('Error fetching products:', error)
  }

  const filtered = products

  if (search) {
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
  try {
    const row = getProductById.get([req.params.id]) as Product
    if (!row) {
      return res.status(404).json({ error: 'Product not found' })
    }
    res.json({
      id: String(row.id),
      name: row.name,
      price: Number(row.price),
      barcode: row.barcode || null,
      category: row.category || null,
      stock: Number(row.stock),
      image_url: row.image_url || null,
      created_at: row.created_at || null,
      updated_at: row.updated_at || null
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    res.status(500).json({ error: 'Failed to fetch product' })
  }
})

// POST /api/products - Create new product
router.post('/', (req: Request, res: Response) => {
  const { name, price, barcode, category, stock, image_url } = req.body

  // Validation
  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' })
  }

  if (Number(price) <= 0) {
    return res.status(400).json({ error: 'Price must be greater than 0' })
  }

  try {
    const insertResult = createProduct.run(name, Number(price), barcode || null, category || null, stock || 0, image_url || null)
    
    // Get the newly created product
    const id = String(insertResult.lastInsertRowid)
    const row = getProductById.get([id]) as Product
    
    if (!row) {
      return res.status(500).json({ error: 'Failed to create product' })
    }

    res.status(201).json({
      id: String(row.id),
      name: row.name,
      price: Number(row.price),
      barcode: row.barcode || null,
      category: row.category || null,
      stock: Number(row.stock),
      image_url: row.image_url || null,
      created_at: row.created_at || null,
      updated_at: row.updated_at || null
    })
  } catch (error) {
    if ((error as any).message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'Product name or barcode already exists' })
    }
    res.status(500).json({ error: 'Failed to create product' })
  }
})

// POST /api/products/cart - Add product to cart (decrease stock)
router.post('/cart', (req: Request, res: Response) => {
  const { productId, quantity } = req.body

  if (!productId || !quantity || Number(quantity) <= 0) {
    return res.status(400).json({ error: 'Product ID and positive quantity are required' })
  }

  try {
    const updateResult = updateProduct.run(Number(quantity), productId, Number(quantity))
    
    if (updateResult.changes === 0) {
      return res.status(400).json({ error: 'Insufficient stock' })
    }

    const row = getProductById.get([productId]) as Product
    if (!row) {
      return res.status(500).json({ error: 'Failed to update stock' })
    }

    res.json({
      id: String(row.id),
      name: row.name,
      price: Number(row.price),
      barcode: row.barcode || null,
      category: row.category || null,
      stock: Number(row.stock),
      image_url: row.image_url || null,
      created_at: row.created_at || null,
      updated_at: row.updated_at || null
    })
  } catch (error) {
    if ((error as any).message.includes('FOREIGN KEY constraint failed')) {
      return res.status(404).json({ error: 'Product not found' })
    }
    res.status(500).json({ error: 'Failed to update stock' })
  }
})

// PUT /api/products/:id - Update product
router.put('/:id', (req: Request, res: Response) => {
  const { name, price, barcode, category, stock, image_url } = req.body

  // Check if product exists
  try {
    const row = getProductById.get([req.params.id]) as Product
    if (!row) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const existing = row

    // Validation for name uniqueness (excluding current product)
    if (name && name !== existing.name) {
      const duplicateRow = db.prepare('SELECT * FROM products WHERE name = ? AND id != ?').get(name, req.params.id) as Product
      if (duplicateRow) {
        return res.status(409).json({ error: 'Product name already exists' })
      }
    }

    // Validation for barcode uniqueness (excluding current product)
    if (barcode && barcode !== existing.barcode) {
      const duplicateRow = db.prepare('SELECT * FROM products WHERE barcode = ? AND id != ?').get(barcode, req.params.id) as Product
      if (duplicateRow) {
        return res.status(409).json({ error: 'Barcode already exists' })
      }
    }

    if (price && Number(price) <= 0) {
      return res.status(400).json({ error: 'Price must be greater than 0' })
    }

    // Only update fields that have new values provided
    const newName = name || existing.name
    const newPrice = price ?? existing.price
    const newBarcode = barcode ?? existing.barcode
    const newCategory = category ?? existing.category
    const newStock = stock ?? existing.stock
    const newImageUrl = image_url ?? existing.image_url

    // Use COALESCE to preserve NULL values when not updating
    updateProduct.run(
      newName,
      newPrice,
      newBarcode || null,
      newCategory,
      newStock,
      newImageUrl || null,
      req.params.id
    )

    const updatedRow = getProductById.get([req.params.id]) as Product
    if (!updatedRow) {
      return res.status(500).json({ error: 'Failed to update product' })
    }

    res.json({
      id: String(updatedRow.id),
      name: updatedRow.name,
      price: Number(updatedRow.price),
      barcode: updatedRow.barcode || null,
      category: updatedRow.category || null,
      stock: Number(updatedRow.stock),
      image_url: updatedRow.image_url || null,
      created_at: updatedRow.created_at || null,
      updated_at: updatedRow.updated_at || null
    })
  } catch (error) {
    console.error('Error updating product:', error)
    res.status(500).json({ error: 'Failed to update product' })
  }
})

// DELETE /api/products/:id - Delete product
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const row = getProductById.get([req.params.id]) as Product
    if (!row) {
      return res.status(404).json({ error: 'Product not found' })
    }

    deleteProduct.run(req.params.id)
    res.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Error deleting product:', error)
    res.status(500).json({ error: 'Failed to delete product' })
  }
})

export default router
