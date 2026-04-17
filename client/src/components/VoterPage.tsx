import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle, Clock } from 'lucide-react'
import { PageLayout } from './PageLayout'
import { LoginCard } from './LoginCard'
import { getSession } from '@/lib/session'
import {
  fetchCandidates,
  fetchVotingDates,
  getSignerVotingContract,
  hasVoted,
  type OnChainCandidate,
} from '@/lib/votingContract'

type Phase = 'loading' | 'waiting' | 'ready' | 'voting' | 'done'

const TOTAL_SECONDS = 300

function formatMmSs(total: number) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function groupByPosition(list: OnChainCandidate[]) {
  const map = new Map<string, OnChainCandidate[]>()
  for (const c of list) {
    const key = c.party || 'General'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(c)
  }
  return map
}

export function VoterPage() {
  const session = getSession()
  const authed = session?.role === 'user' && !!session.voterId

  const [phase, setPhase] = useState<Phase>('loading')
  const [candidates, setCandidates] = useState<OnChainCandidate[]>([])
  const [dates, setDates] = useState<{ start: Date; end: Date } | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const autoFiredRef = useRef(false)

  const grouped = useMemo(() => groupByPosition(candidates), [candidates])

  const electionActive = useMemo(() => {
    if (!dates) return false
    const t = Date.now()
    return t >= dates.start.getTime() && t < dates.end.getTime()
  }, [dates])

  const load = useCallback(async () => {
    if (!session?.voterId) return
    setError(null)
    setPhase('loading')
    try {
      const [list, d, voted] = await Promise.all([
        fetchCandidates(),
        fetchVotingDates(),
        hasVoted(session.voterId),
      ])
      setCandidates(list)
      setDates(d)
      if (voted) {
        setPhase('done')
      } else if (!d) {
        setPhase('waiting')
      } else {
        const t = Date.now()
        if (t < d.start.getTime() || t >= d.end.getTime()) setPhase('waiting')
        else setPhase('ready')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load election')
      setPhase('waiting')
    }
  }, [session?.voterId])

  useEffect(() => {
    if (!authed) return
    void load()
  }, [authed, load])

  const submitVote = useCallback(async () => {
    if (!session?.voterId || selectedId == null) return
    setBusy(true)
    setError(null)
    try {
      const c = getSignerVotingContract()
      const tx = await c.vote(selectedId, session.voterId)
      await tx.wait()
      setPhase('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Vote failed')
      setSecondsLeft(90)
      autoFiredRef.current = false
    } finally {
      setBusy(false)
    }
  }, [selectedId, session?.voterId])

  useEffect(() => {
    if (phase !== 'voting') return
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s <= 0 ? 0 : s - 1))
    }, 1000)
    return () => window.clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase !== 'voting' || secondsLeft > 0 || busy || autoFiredRef.current) return
    autoFiredRef.current = true
    if (selectedId != null) void submitVote()
    else setPhase('ready')
  }, [phase, secondsLeft, selectedId, busy, submitVote])

  function startVoting() {
    autoFiredRef.current = false
    setSecondsLeft(TOTAL_SECONDS)
    setSelectedId(null)
    setPhase('voting')
  }

  if (!authed) {
    return (
      <PageLayout showBack subtitle="Voter Portal">
        <LoginCard expectedRole="user" title="Voter login" />
      </PageLayout>
    )
  }

  if (phase === 'done') {
    return (
      <PageLayout showBack subtitle="Voter Portal">
        <div className="mx-auto max-w-lg rounded-lg border border-emerald-200 bg-white/95 p-8 text-center shadow backdrop-blur-sm">
          <CheckCircle className="mx-auto mb-4 h-14 w-14 text-emerald-600" />
          <h2 className="text-2xl font-bold text-slate-900">Vote Submitted Successfully!</h2>
          <p className="mt-2 text-slate-600">Thank you for participating in the Gymkhana Union Body election.</p>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout showBack subtitle="Voter Portal">
      <div className="mx-auto max-w-3xl space-y-6">
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
        ) : null}

        {phase === 'loading' ? (
          <p className="rounded-lg bg-white/95 p-6 text-center text-slate-600 backdrop-blur-sm">Loading election…</p>
        ) : null}

        {phase === 'waiting' ? (
          <div className="rounded-lg border border-slate-200 bg-white/95 p-8 shadow backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-slate-900">Election is not active</h2>
            <p className="mt-2 text-sm text-slate-600">
              You can vote only during the scheduled window recorded on the blockchain.
            </p>
            {dates ? (
              <p className="mt-4 text-sm text-slate-800">
                <span className="font-medium">Period:</span> {dates.start.toLocaleString()} — {dates.end.toLocaleString()}
              </p>
            ) : (
              <p className="mt-4 text-sm text-slate-600">Waiting for an administrator to define voting dates.</p>
            )}
          </div>
        ) : null}

        {phase === 'ready' && electionActive ? (
          <div className="rounded-lg border border-emerald-200 bg-white/95 p-8 text-center shadow backdrop-blur-sm">
            <p className="mb-6 text-slate-700">
              You will have 5 minutes to cast your vote for all positions (the chain records one ballot per scholar ID,
              matching the deployed contract).
            </p>
            <button
              type="button"
              onClick={startVoting}
              className="rounded-lg bg-emerald-600 px-10 py-4 text-lg font-semibold text-white shadow transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              Cast Vote
            </button>
          </div>
        ) : null}

        {phase === 'voting' ? (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-sm">
              <Clock className="h-5 w-5 text-slate-700" />
              <span className="font-mono text-2xl font-bold text-slate-900">{formatMmSs(secondsLeft)}</span>
            </div>
            <div className="space-y-8 rounded-lg border border-slate-200 bg-white/95 p-6 shadow backdrop-blur-sm">
              <p className="text-sm text-slate-600">
                Select one candidate. Groups reflect the &quot;post&quot; field stored on-chain for each nomination.
              </p>
              {[...grouped.entries()].map(([position, rows]) => (
                <div key={position}>
                  <h3 className="mb-3 text-lg font-semibold text-slate-900">{position}</h3>
                  <ul className="space-y-3">
                    {rows.map((c) => {
                      const checked = selectedId === c.id
                      return (
                        <li key={c.id}>
                          <label
                            className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition ${
                              checked ? 'border-blue-500 bg-blue-50/80' : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="radio"
                              className="sr-only"
                              name="ballot"
                              checked={checked}
                              onChange={() => setSelectedId(c.id)}
                            />
                            {checked ? (
                              <CheckCircle className="h-5 w-5 shrink-0 text-blue-600" />
                            ) : (
                              <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300" />
                            )}
                            <div>
                              <p className="font-medium text-slate-900">{c.name}</p>
                              <p className="text-sm text-slate-600">{c.party}</p>
                            </div>
                          </label>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ))}
              <button
                type="button"
                disabled={selectedId == null || busy}
                onClick={() => void submitVote()}
                className="w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Submitting…' : 'Submit vote'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </PageLayout>
  )
}
