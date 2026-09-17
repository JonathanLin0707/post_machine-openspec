import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load server/.env before any module reads process.env.DATABASE_URL.
// ESM hoists static imports before module bodies, so dotenv.config() in
// index.ts runs too late; this module runs first because pool.ts imports it.
// Existing process env variables always win over .env values.
const serverRoot = path.resolve(__dirname, '../../')
dotenv.config({ path: path.join(serverRoot, '.env') })