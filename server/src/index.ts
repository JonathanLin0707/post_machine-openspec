import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import productsRoutes from './routes/products.js'
import ordersRoutes from './routes/orders.js'
import reportsRoutes from './routes/reports.js'
import { initDatabase } from './database.js'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const app = express()
const PORT = Number(process.env.PORT)  || 8080


const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const clientDistPath = path.resolve(__dirname, '../../client/dist')

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Initialize database before setting up routes
const db = initDatabase()

// Routes
app.use('/api/products', productsRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/reports', reportsRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Serve React frontend
app.use(express.static(clientDistPath))

// React Router fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'))
})

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log('Database data will be automatically persisted to disk')
})

export default app
