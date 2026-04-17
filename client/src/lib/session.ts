const AUTH_TOKEN = 'gymkhana_auth_token'
const AUTH_ROLE = 'gymkhana_auth_role'
const VOTER_ID = 'gymkhana_voter_id'

export type AuthRole = 'admin' | 'user'

export function setSession(token: string, role: AuthRole | string, voterId: string) {
  sessionStorage.setItem(AUTH_TOKEN, token)
  sessionStorage.setItem(AUTH_ROLE, role)
  sessionStorage.setItem(VOTER_ID, voterId)
}

export function clearSession() {
  sessionStorage.removeItem(AUTH_TOKEN)
  sessionStorage.removeItem(AUTH_ROLE)
  sessionStorage.removeItem(VOTER_ID)
}

export function getSession(): { token: string; role: string; voterId: string } | null {
  const token = sessionStorage.getItem(AUTH_TOKEN)
  const role = sessionStorage.getItem(AUTH_ROLE)
  const voterId = sessionStorage.getItem(VOTER_ID)
  if (!token || !role || !voterId) return null
  return { token, role, voterId }
}
