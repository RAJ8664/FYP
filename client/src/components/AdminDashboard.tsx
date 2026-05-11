import { useCallback, useEffect, useMemo, useState } from 'react'
import { Calendar, Pencil, Trash2 } from 'lucide-react'
import { PageLayout } from './PageLayout'
import { LoginCard } from './LoginCard'
import { getSession } from '@/lib/session'
import {
  adminCreateElection,
  adminDeleteNomination,
  adminDeleteElection,
  adminListElections,
  adminListNominations,
  adminUpdateElection,
  adminUpdateNomination,
  type Election,
  type Nomination,
} from '@/lib/api'

function toInputDateTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function AdminDashboard() {
  const session = getSession()
  const authed = session?.role === 'admin'

  const [elections, setElections] = useState<Election[]>([])
  const [nominations, setNominations] = useState<Nomination[]>([])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [editingElectionId, setEditingElectionId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')

  const electionById = useMemo(() => {
    const map = new Map<string, Election>()
    for (const election of elections) map.set(election.id, election)
    return map
  }, [elections])

  const nominationsByPosition = useMemo(() => {
    const map = new Map<string, Nomination[]>()
    for (const nomination of nominations) {
      const key = nomination.post
      if (!map.has(key)) map.set(key, [])
      map.get(key)?.push(nomination)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [nominations])

  const refresh = useCallback(async () => {
    const [electionRes, nominationRes] = await Promise.all([adminListElections(), adminListNominations()])
    setElections(electionRes.elections)
    setNominations(nominationRes.nominations)
  }, [])

  useEffect(() => {
    if (!authed) return
    setBusy(true)
    void refresh()
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load dashboard'))
      .finally(() => setBusy(false))
  }, [authed, refresh])

  function resetElectionForm() {
    setEditingElectionId(null)
    setTitle('')
    setDescription('')
    setStartAt('')
    setEndAt('')
  }

  async function saveElection() {
    if (!title.trim() || !startAt || !endAt) {
      setError('Title, start time and end time are required')
      return
    }
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      if (editingElectionId) {
        await adminUpdateElection(editingElectionId, {
          title: title.trim(),
          description: description.trim(),
          startAt,
          endAt,
        })
        setMessage('Election updated')
      } else {
        await adminCreateElection({
          title: title.trim(),
          description: description.trim(),
          startAt,
          endAt,
        })
        setMessage('Election created')
      }
      resetElectionForm()
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save election')
    } finally {
      setBusy(false)
    }
  }

  function beginEditElection(election: Election) {
    setEditingElectionId(election.id)
    setTitle(election.title)
    setDescription(election.description ?? '')
    setStartAt(toInputDateTime(election.startAt))
    setEndAt(toInputDateTime(election.endAt))
  }

  async function deleteElection(electionId: string) {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await adminDeleteElection(electionId)
      if (editingElectionId === electionId) resetElectionForm()
      setMessage('Election deleted')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete election')
    } finally {
      setBusy(false)
    }
  }

  async function approveNomination(nominationId: string, electionId: string) {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await adminUpdateNomination(nominationId, { status: 'approved', electionId })
      setMessage('Nomination approved and linked to election')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not approve nomination')
    } finally {
      setBusy(false)
    }
  }

  async function rejectNomination(nominationId: string) {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await adminDeleteNomination(nominationId)
      setMessage('Nomination deleted')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete nomination')
    } finally {
      setBusy(false)
    }
  }

  if (!authed) {
    return (
      <PageLayout showBack subtitle="Admin Dashboard">
        <LoginCard expectedRole="admin" title="Administrator login" />
      </PageLayout>
    )
  }

  return (
    <PageLayout showBack subtitle="Admin Dashboard">
      <div className="space-y-6">
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}
        {message ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
        ) : null}

        <section className="rounded-lg border border-slate-200 bg-white/95 p-6 shadow backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-slate-900">{editingElectionId ? 'Modify Election' : 'Create Election'}</h2>
          <p className="mt-1 text-sm text-slate-600">
            Admin can create, edit, list, and delete elections here. Each election automatically includes all 6 positions.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Election title</label>
              <input
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Gymkhana President Election 2026"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Start date &amp; time</label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">End date &amp; time</label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <textarea
                className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void saveElection()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {editingElectionId ? 'Update election' : 'Create election'}
            </button>
            {editingElectionId ? (
              <button
                type="button"
                disabled={busy}
                onClick={resetElectionForm}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel edit
              </button>
            ) : null}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white/95 p-6 shadow backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-slate-900">Election List</h2>
          <div className="mt-4 space-y-3">
            {elections.map((election) => (
              <article key={election.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{election.title}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      <Calendar className="mr-1 inline h-3.5 w-3.5" />
                      {new Date(election.startAt).toLocaleString()} - {new Date(election.endAt).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">
                      Status: <span className="font-medium">{election.phase}</span> | Candidates: {election.candidateCount}
                    </p>
                    <p className="mt-1 text-xs text-slate-600">Total votes cast: {election.voteCount}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => beginEditElection(election)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil className="h-4 w-4" />
                      Modify
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteElection(election.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm text-red-700 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
                <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">Current Position-wise Leaderboard</p>
                  {election.positionLeaderboards && election.positionLeaderboards.length > 0 ? (
                    <div className="mt-2 space-y-3">
                      {election.positionLeaderboards.map((block) => (
                        <div key={`${election.id}-${block.position}`} className="rounded-md border border-slate-100 bg-slate-50 p-3">
                          <p className="text-sm font-semibold text-slate-800">{block.position}</p>
                          {block.standings.length > 0 ? (
                            <ol className="mt-2 space-y-1">
                              {block.standings.map((entry, idx) => (
                                <li
                                  key={`${election.id}-${block.position}-${entry.candidateId}`}
                                  className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm"
                                >
                                  <span className="text-slate-800">
                                    #{idx + 1} {entry.fullName} <span className="text-slate-500">({entry.department})</span>
                                  </span>
                                  <span className="font-semibold text-slate-900">{entry.votes} votes</span>
                                </li>
                              ))}
                            </ol>
                          ) : (
                            <p className="mt-1 text-sm text-slate-500">No approved candidates yet for this position.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">No approved candidates or votes yet.</p>
                  )}
                </div>
              </article>
            ))}
            {elections.length === 0 ? <p className="text-sm text-slate-500">No elections created yet.</p> : null}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white/95 p-6 shadow backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-slate-900">Nominee Applications</h2>
          <p className="mt-1 text-sm text-slate-600">
            Submitted nominations are grouped by position. Approve/reject requests position-wise.
          </p>
          <div className="mt-4 space-y-4">
            {nominationsByPosition.map(([position, rows]) => (
              <div key={position} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <h3 className="mb-3 text-sm font-semibold text-slate-900">{position}</h3>
                <div className="space-y-3">
                  {rows.map((nomination) => {
                    const assignableElections = elections.filter((election) =>
                      election.positions.some((p) => p.toLowerCase() === nomination.post.toLowerCase()),
                    )
                    return (
                      <article key={nomination.id} className="rounded-lg border border-slate-200 bg-white p-4">
                        <div className="flex flex-wrap gap-4">
                          <img
                            src={nomination.photoUrl}
                            alt={nomination.fullName}
                            className="h-16 w-16 rounded-full object-cover ring-2 ring-slate-200"
                          />
                          <div className="min-w-[16rem] flex-1">
                            <p className="font-semibold text-slate-900">{nomination.fullName}</p>
                            <p className="text-sm text-slate-700">
                              {nomination.post} | {nomination.department} | CGPA {nomination.cgpa}
                            </p>
                            <p className="text-xs text-slate-600">
                              Scholar ID: {nomination.scholarId} | Submitted: {new Date(nomination.createdAt).toLocaleString()}
                            </p>
                            <p className="mt-1 text-xs text-slate-700">
                              Status: <span className="font-medium">{nomination.status}</span>
                              {nomination.approvedElectionId
                                ? ` (Election: ${electionById.get(nomination.approvedElectionId)?.title ?? nomination.approvedElectionId})`
                                : ''}
                            </p>
                            {nomination.proofDocuments && nomination.proofDocuments.length > 0 ? (
                              <div className="mt-2 text-xs text-slate-700">
                                <p className="font-medium">Supporting documents:</p>
                                <ul className="mt-1 flex flex-wrap gap-2">
                                  {nomination.proofDocuments.map((doc) => (
                                    <li key={`${nomination.id}-${doc.url}`}>
                                      <a
                                        href={doc.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-blue-700 hover:bg-blue-100"
                                      >
                                        {doc.name}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ) : nomination.proofFileNames.length > 0 ? (
                              <p className="mt-2 text-xs text-slate-600">
                                Supporting documents: {nomination.proofFileNames.join(', ')}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {assignableElections.map((election) => (
                            <button
                              key={election.id}
                              type="button"
                              disabled={busy}
                              onClick={() => void approveNomination(nomination.id, election.id)}
                              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                            >
                              Approve for {election.title}
                            </button>
                          ))}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void rejectNomination(nomination.id)}
                            className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            ))}
            {nominations.length === 0 ? <p className="text-sm text-slate-500">No nominations submitted yet.</p> : null}
          </div>
        </section>
      </div>
    </PageLayout>
  )
}
