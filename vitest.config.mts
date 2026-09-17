import { defineConfig } from 'vitest/config'

// Server tests share a single local PostgreSQL test database, so files must
// run sequentially: parallel workers TRUNCATE/seed the same tables and
// deadlock or clobber each other's data.
export default defineConfig({
  test: {
    fileParallelism: false,
  },
})