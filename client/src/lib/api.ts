import { setSession, type AuthRole } from './session'

export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

async function readDetail(res: Response): Promise<string> {
  try {
    const data: unknown = await res.json()
    if (data && typeof data === 'object' && 'detail' in data) {
      const d = (data as { detail: unknown }).detail
      if (typeof d === 'string') return d
      if (Array.isArray(d)) return d.map(String).join(', ')
    }
    if (data && typeof data === 'object' && 'message' in data) {
      const m = (data as { message: unknown }).message
      if (typeof m === 'string') return m
    }
  } catch {
    /* ignore */
  }
  return res.statusText || 'Request failed'
}

export async function authenticate(voterId: string, password: string) {
  const res = await fetch('/api-auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voter_id: voterId, password }),
  })
  if (!res.ok) throw new ApiError(res.status, await readDetail(res))
  return (await res.json()) as { token: string; role: AuthRole | string }
}

export async function persistLoginSession(voterId: string, token: string, role: string) {
  const sessionRes = await fetch('/api/session', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  if (!sessionRes.ok) throw new ApiError(sessionRes.status, 'Could not establish session')
  setSession(token, role, voterId)
}

export async function registerRequest(voterId: string, password: string, email: string) {
  const res = await fetch('/api-auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voter_id: voterId, password, email }),
  })
  if (!res.ok) throw new ApiError(res.status, await readDetail(res))
  return (await res.json()) as { message: string }
}

export async function logoutRequest() {
  await fetch('/api/logout', { method: 'POST', credentials: 'include' })
}
