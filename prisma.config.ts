import { defineConfig } from '@prisma/config'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

export default defineConfig({
  earlyAccess: true,
  datasource: {
    url: process.env.DATABASE_URL || "file:./arth.db",
  },
})
