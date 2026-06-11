import { Redis } from "@upstash/redis"

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// Асуултуудыг 1 цаг кэшлэнэ
export const QUESTIONS_TTL = 3600
