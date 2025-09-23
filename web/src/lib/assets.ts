export function asset(path: string) {
  const prefix = (process.env.NEXT_PUBLIC_BASE_PATH || '').trim()
  const p = path.startsWith('/') ? path : `/${path}`
  return `${prefix}${p}`
}
