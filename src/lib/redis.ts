import { Redis } from "@upstash/redis"

// The cache is optional. With no Upstash credentials (or the placeholder from .env.example), or
// whenever Redis is unreachable, reads miss and writes are skipped, so callers fall back to the
// database instead of crashing the page.
const url = process.env.UPSTASH_REDIS_REST_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN
const configured = Boolean(url && token && /^https?:\/\//.test(url) && !url.includes("replace-me"))
const client = configured ? new Redis({ url: url!, token: token! }) : null

export const redis = {
  async get<T>(key: string): Promise<T | null> {
    if (!client) return null
    try {
      return await client.get<T>(key)
    } catch (err) {
      console.warn("redis get failed, falling back to the database:", (err as Error).message)
      return null
    }
  },
  async set(key: string, value: unknown, opts?: { ex: number }): Promise<void> {
    if (!client) return
    try {
      await client.set(key, value, opts)
    } catch (err) {
      console.warn("redis set failed, continuing without cache:", (err as Error).message)
    }
  },
}

// Асуултуудыг 1 цаг кэшлэнэ
export const QUESTIONS_TTL = 3600
