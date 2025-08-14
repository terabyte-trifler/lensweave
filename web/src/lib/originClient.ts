// src/lib/originClient.ts
import axios, { type AxiosInstance } from 'axios'

const ORIGIN_BASE =
  process.env.NEXT_PUBLIC_ORIGIN_API_BASE?.trim() || 'https://api.origin.camp/v1'
const ORIGIN_API_KEY = process.env.ORIGIN_API_KEY?.trim() || ''

// Create a typed axios instance
export const origin: AxiosInstance = axios.create({
  baseURL: ORIGIN_BASE,
  headers: {
    'Content-Type': 'application/json',
    ...(ORIGIN_API_KEY ? { Authorization: `Bearer ${ORIGIN_API_KEY}` } : {}),
  },
})

// (Optional) response interceptor with explicit types
origin.interceptors.response.use(
  (resp) => resp,
  (error) => {
    // Keep types explicit without `any`
    const status = error?.response?.status as number | undefined
    const data = error?.response?.data as unknown
    const message =
      typeof data === 'string' ? data : JSON.stringify(data ?? { error: 'Unknown Origin error' })
    return Promise.reject(
      new Error(`Origin API${status ? ` ${status}` : ''}: ${message}`),
    )
  },
)
