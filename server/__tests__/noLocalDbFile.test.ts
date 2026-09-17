import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import path from 'path'
import os from 'os'
import fs from 'fs'
import {
  closeTestDatabase,
  initTestDatabase,
  probeDatabase,
  resetDatabase,
  seedProduct,
} from './helpers.js'

const available = await probeDatabase()
const describeOk = available ? describe : describe.skip
const beforeAllOk = available ? beforeAll : () => {}

// Point the legacy SQLite env var at a sentinel path: the runtime must ignore it
const sentinel = path.join(os.tmpdir(), `no-local-db-${process.pid}.db`)
process.env.DATABASE_PATH = sentinel

beforeAllOk(async () => {
  await initTestDatabase()
  await resetDatabase()
  // Exercise a real PostgreSQL write path
  const id = await seedProduct('Local File Probe', 10)
  expect(id).toBeGreaterThan(0)
})

afterAll(async () => {
  await closeTestDatabase()
})

describeOk('No local database files', () => {
  it('never creates a local SQLite file on disk', () => {
    for (const f of [sentinel, sentinel + '-wal', sentinel + '-shm']) {
      expect(fs.existsSync(f)).toBe(false)
    }
  })
})