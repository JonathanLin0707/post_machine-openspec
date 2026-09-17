import express from 'express'
import cors from 'cors'
import productsRoutes from './routes/products.js'
import ordersRoutes from './routes/orders.js'
import reportsRoutes from './routes/reports.js'
import databaseRoutes from './routes/database.js'
import { initDatabase } from './database.js'
import path from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const app = express()
const PORT = Number(process.env.PORT) || 8080

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const clientDistPath = path.resolve(__dirname, '../../client/dist')

let databaseReady = false

function describeDbError(err: unknown): string {
  if (err instanceof Error) {
    const code = (err as NodeJS.ErrnoException).code
    const prefix = code ? `${err.name}: ${err.message} (${code})` : `${err.name}: ${err.message}`
    const errors = (err as Error & { errors?: readonly unknown[] }).errors
    if (errors?.length) {
      const details = errors
        .map((e) => (e instanceof Error ? `${e.name}: ${e.message}` : String(e)))
        .join(' | ')
      return `${prefix} [${details}]`
    }
    return prefix
  }
  return String(err)
}

// Middleware
app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Initialize database before accepting traffic
initDatabase()
  .then(() => {
    databaseReady = true
    console.log('Database initialized successfully')
  })
  .catch((err) => {
    // Server stays up so /health can report the failure (503)
    console.error(
      'Database initialization failed. DATABASE_URL set:',
      Boolean(process.env.DATABASE_URL),
      'Error:',
      describeDbError(err),
    )
  })

// Routes
app.use('/api/products', productsRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/database', databaseRoutes)

// Health check
app.get('/health', (req, res) => {
  if (!databaseReady) {
    res.status(503).json({ status: 'unavailable' })
    return
  }
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Serve React frontend
app.use(express.static(clientDistPath))

// React Router fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'))
})

// Error handling middleware
app.use((err: Error & { status?: number }, req: express.Request, res: express.Response) => {
  console.error('Error:', err.message)
  res.status(err.status ?? 500).json({
    error: err.message || 'Internal server error',
  })
})

const isMain =
  !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

export default app