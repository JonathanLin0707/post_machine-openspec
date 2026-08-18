import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import productsRoutes from './routes/products'
import ordersRoutes from './routes/orders'
import reportsRoutes from './routes/reports'
import { initDatabase, saveDatabase } from './database'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 8080

// Middleware
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Initialize database before setting up routes
initDatabase().then(() => {
  // Routes
  app.use('/api/products', productsRoutes)
  app.use('/api/orders', ordersRoutes)
  app.use('/api/reports', reportsRoutes)

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err.message)
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
    })
  })

  // Save database on exit
  process.on('beforeExit', saveDatabase)
  process.on('SIGINT', () => {
    saveDatabase()
    process.exit(0)
  })

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}).catch((error) => {
  console.error('Failed to initialize database:', error)
  process.exit(1)
})

export default app
