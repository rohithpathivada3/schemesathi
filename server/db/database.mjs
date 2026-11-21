import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DB_PATH = path.join(__dirname, 'schemesathi.db')
const SCHEMA_PATH = path.join(__dirname, 'schema.sql')

let dbInstance = null

export function getDatabase() {
  if (!dbInstance) {
    const dbDir = path.dirname(DB_PATH)
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    dbInstance = new DatabaseSync(DB_PATH)
    dbInstance.exec('PRAGMA foreign_keys = ON;')

    if (fs.existsSync(SCHEMA_PATH)) {
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8')
      dbInstance.exec(schema)
    }
  }
  return dbInstance
}

export function closeDatabase() {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
