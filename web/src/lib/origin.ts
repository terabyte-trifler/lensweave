import axios from 'axios'

const base = process.env.NEXT_PUBLIC_ORIGIN_API_BASE!
const key  = process.env.ORIGIN_API_KEY!

export const origin = axios.create({
  baseURL: base,
  headers: { Authorization: `Bearer ${key}` },
})
