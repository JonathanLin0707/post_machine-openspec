import express from 'express'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { getDb } from '../database.js'

const router = express.Router()

router.get('/export', async (req, res) => {
  const tempPath = path.join(
    os.tmpdir(),
    `grocery-backup-${Date.now()}.db`
  )

  try {
    const db = getDb()

    // 建立 SQLite 一致性 backup
    await db.backup(tempPath)

    const filename = `grocery_${new Date()
      .toISOString()
      .replace(/[:.]/g, '-')}.db`

    res.download(tempPath, filename, (err) => {
      // 無論下載成功或失敗，都刪除 temporary DB
      fs.unlink(tempPath, () => {})

      if (err) {
        console.error('Database download error:', err)
      }
    })
  } catch (error) {
    console.error('Database backup error:', error)

    // 如果 backup 失敗，也清理檔案
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath)
    }

    res.status(500).json({
      error: 'Failed to export database',
    })
  }
})

export default router