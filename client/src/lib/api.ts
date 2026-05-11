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

export type NominationStatus = 'pending' | 'approved' | 'rejected'

export type Nomination = {
  id: string
  fullName: string
  scholarId: string
  cgpa: number
  post: string
  department: string
  status: NominationStatus
  approvedElectionId: string | null
  photoUrl: string
  proofFileNames: string[]
  createdAt: string
  updatedAt: string
}

export type ElectionCandidate = {
  id: string
  fullName: string
  scholarId: string
  department: string
  post: string
  cgpa: number
  photoUrl: string
}

export type Election = {
  id: string
  title: string
  description: string
  position: string
  startAt: string
  endAt: string
  createdAt: string
  updatedAt: string
  phase: 'upcoming' | 'ongoing' | 'completed' | 'invalid'
  candidateCount: number
  voteCount: number
  candidates: ElectionCandidate[]
  hasVoted?: boolean
}

type RequestOptions = {
  method?: string
  body?: unknown
}

async function requestJson<T>(url: string, options?: RequestOptions): Promise<T> {
  const res = await fetch(url, {
    method: options?.method ?? 'GET',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: options?.body == null ? undefined : JSON.stringify(options.body),
  })
  if (!res.ok) throw new ApiError(res.status, await readDetail(res))
  return (await res.json()) as T
}

export async function submitNomination(input: {
  fullName: string
  scholarId: string
  cgpa: number
  post: string
  department: string
  photoDataUrl: string
  proofFileNames: string[]
}) {
  return requestJson<{ nomination: Nomination }>('/api/nominations', {
    method: 'POST',
    body: input,
  })
}

export async function adminListNominations(status?: NominationStatus) {
  const suffix = status ? `?status=${encodeURIComponent(status)}` : ''
  return requestJson<{ nominations: Nomination[] }>(`/api/admin/nominations${suffix}`)
}

export async function adminUpdateNomination(nominationId: string, input: { status: NominationStatus; electionId?: string }) {
  return requestJson<{ nomination: Nomination }>(`/api/admin/nominations/${encodeURIComponent(nominationId)}`, {
    method: 'PATCH',
    body: input,
  })
}

export async function adminListElections() {
  return requestJson<{ elections: Election[] }>('/api/admin/elections')
}

export async function adminCreateElection(input: {
  title: string
  position: string
  description: string
  startAt: string
  endAt: string
}) {
  return requestJson<{ election: Election }>('/api/admin/elections', { method: 'POST', body: input })
}

export async function adminUpdateElection(
  electionId: string,
  input: { title: string; position: string; description: string; startAt: string; endAt: string },
) {
  return requestJson<{ election: Election }>(`/api/admin/elections/${encodeURIComponent(electionId)}`, {
    method: 'PUT',
    body: input,
  })
}

export async function adminDeleteElection(electionId: string) {
  return requestJson<{ deletedElectionId: string }>(`/api/admin/elections/${encodeURIComponent(electionId)}`, {
    method: 'DELETE',
  })
}

export async function listOngoingElections() {
  return requestJson<{ elections: Election[] }>('/api/elections/ongoing')
}

export async function submitVote(electionId: string, candidateId: string) {
  return requestJson<{ vote: { id: string } }>(`/api/elections/${encodeURIComponent(electionId)}/votes`, {
    method: 'POST',
    body: { candidateId },
  })
}

export type ResultWinner = {
  candidateId: string
  fullName: string
  department: string
  post: string
  photoUrl: string
  votes: number
}

export type ElectionResult = {
  electionId: string
  title: string
  position: string
  startAt: string
  endAt: string
  winner: ResultWinner | null
  rankings: ResultWinner[]
}

export async function listCompletedResults() {
  return requestJson<{ results: ElectionResult[] }>('/api/results')
}
