import './env.js'
import pg from 'pg'

const connectionString = process.env.DATABASE_URL

export function requiresSsl(): boolean {
  if (
    process.env.PGSSLMODE === 'require' ||
    process.env.PGSSLMODE === 'verify-full'
  ) {
    return true
  }
  return (
    connectionString?.includes('supabase.co') === true ||
    connectionString?.includes('supabase.com') === true
  )
}

export const pool = new pg.Pool({
  connectionString,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  ...(requiresSsl() ? { ssl: { rejectUnauthorized: false } } : {}),
})

export async function checkConnection(): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('SELECT 1')
  } finally {
    client.release()
  }
}