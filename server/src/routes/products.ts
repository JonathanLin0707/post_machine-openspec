import { Router, Request, Response } from 'express'
import { query } from '../database.js'
import { Product } from 'shared'


const router = Router()

const GET_ALL_PRODUCTS_SQL = 'SELECT * FROM products'
const GET_PRODUCT_BY_ID_SQL = 'SELECT * FROM products WHERE id = $1'
const CREATE_PRODUCT_SQL = `INSERT INTO products (name, price, barcode, category, stock, image_url)
                            VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`
const UPDATE_PRODUCT_SQL = `UPDATE products
                            SET name = $1, price = $2, barcode = $3, category = $4, stock = $5, image_url = $6, updated_at = now()
                            WHERE id = $7`

function toProductResponse(row: Product) {
  return {
    id: String(row.id),
    name: row.name,
    price: Number(row.price),
    barcode: row.barcode || null,
    category: row.category || null,
    stock: Number(row.stock),
    image_url: row.imageUrl || null,
    created_at: row.createdAt || null,
    updated_at: row.updatedAt || null
  }
}

// GET /api/products - Get all products with search and filter
router.get('/', async (req: Request, res: Response) => {
  const { search, category } = req.query
  const products: Product[] = []

  try {
    const result = await query<Product>(GET_ALL_PRODUCTS_SQL)
    result.rows.forEach((row) => {
      products.push({
        id: String(row.id),
        name: row.name,
        price: Number(row.price),
        barcode: row.barcode,
        category: row.category,
        stock: Number(row.stock),
        imageUrl: row.imageUrl,
        createdAt: row.createdAt || null,
        updatedAt: row.updatedAt || null
      })
    })
  } catch (error) {
    console.error('Error fetching products:', error)
  }

  let filtered = products

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
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const result = await query<Product>(GET_PRODUCT_BY_ID_SQL, [req.params.id])
    const row = result.rows[0]
    if (!row) {
      return res.status(404).json({ error: 'Product not found' })
    }
    res.json(toProductResponse(row))
  } catch (error) {
    console.error('Error fetching product:', error)
    res.status(500).json({ error: 'Failed to fetch product' })
  }
})

// POST /api/products - Create new product
router.post('/', async (req: Request, res: Response) => {
  const { name, price, barcode, category, stock, image_url } = req.body

  // Validation
  if (!name || !price) {
    return res.status(400).json({ error: 'Name and price are required' })
  }

  if (Number(price) <= 0) {
    return res.status(400).json({ error: 'Price must be greater than 0' })
  }

  try {
    const insertResult = await query<{ id: string }>(
      CREATE_PRODUCT_SQL,
      [name, Number(price), barcode || null, category || null, stock || 0, image_url || null],
    )

    // Get the newly created product
    const id = String(insertResult.rows[0].id)
    const result = await query<Product>(GET_PRODUCT_BY_ID_SQL, [id])
    const row = result.rows[0]

    if (!row) {
      return res.status(500).json({ error: 'Failed to create product' })
    }

    res.status(201).json(toProductResponse(row))
  } catch (error) {
    if ((error as { code?: string }).code === '23505') {
      return res.status(409).json({ error: 'Product name or barcode already exists' })
    }
    res.status(500).json({ error: 'Failed to create product' })
  }
})

// POST /api/products/cart - Add product to cart (decrease stock)
router.post('/cart', async (req: Request, res: Response) => {
  const { productId, quantity } = req.body

  if (!productId || !quantity || Number(quantity) <= 0) {
    return res.status(400).json({ error: 'Product ID and positive quantity are required' })
  }

  try {
    const updateResult = await query(UPDATE_PRODUCT_SQL, [Number(quantity), productId, Number(quantity)])

    if (updateResult.rowCount === 0) {
      return res.status(400).json({ error: 'Insufficient stock' })
    }

    const result = await query<Product>(GET_PRODUCT_BY_ID_SQL, [productId])
    const row = result.rows[0]
    if (!row) {
      return res.status(500).json({ error: 'Failed to update stock' })
    }

    res.json(toProductResponse(row))
  } catch (error) {
    if ((error as { message: string }).message.includes('FOREIGN KEY constraint failed')) {
      return res.status(404).json({ error: 'Product not found' })
    }
    res.status(500).json({ error: 'Failed to update stock' })
  }
})

// PUT /api/products/:id - Update product
router.put('/:id', async (req: Request, res: Response) => {
  const { name, price, barcode, category, stock, image_url } = req.body

  // Check if product exists
  try {
    const existingResult = await query<Product>(GET_PRODUCT_BY_ID_SQL, [req.params.id])
    const row = existingResult.rows[0]
    if (!row) {
      return res.status(404).json({ error: 'Product not found' })
    }

    const existing = row

    // Validation for name uniqueness (excluding current product)
    if (name && name !== existing.name) {
      const dupName = await query<Product>('SELECT * FROM products WHERE name = $1 AND id != $2', [name, req.params.id])
      if (dupName.rows[0]) {
        return res.status(409).json({ error: 'Product name already exists' })
      }
    }

    // Validation for barcode uniqueness (excluding current product)
    if (barcode && barcode !== existing.barcode) {
      const dupBarcode = await query<Product>('SELECT * FROM products WHERE barcode = $1 AND id != $2', [barcode, req.params.id])
      if (dupBarcode.rows[0]) {
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
    const newImageUrl = image_url ?? existing.imageUrl

    await query(
      UPDATE_PRODUCT_SQL,
      [
        newName,
        newPrice,
        newBarcode || null,
        newCategory,
        newStock,
        newImageUrl || null,
        req.params.id,
      ],
    )

    const updatedResult = await query<Product>(GET_PRODUCT_BY_ID_SQL, [req.params.id])
    const updatedRow = updatedResult.rows[0]
    if (!updatedRow) {
      return res.status(500).json({ error: 'Failed to update product' })
    }

    res.json(toProductResponse(updatedRow))
  } catch (error) {
    console.error('Error updating product:', error)
    res.status(500).json({ error: 'Failed to update product' })
  }
})

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const existingResult = await query<Product>(GET_PRODUCT_BY_ID_SQL, [req.params.id])
    const row = existingResult.rows[0]
    if (!row) {
      return res.status(404).json({ error: 'Product not found' })
    }

    await query('DELETE FROM products WHERE id = $1', [req.params.id])
    res.json({ message: 'Product deleted successfully' })
  } catch (error) {
    console.error('Error deleting product:', error)
    res.status(500).json({ error: 'Failed to delete product' })
  }
})

export default router