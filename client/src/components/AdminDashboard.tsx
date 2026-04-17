import { useCallback, useEffect, useState } from 'react'
import { Calendar, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { PageLayout } from './PageLayout'
import { LoginCard } from './LoginCard'
import { getSession } from '@/lib/session'
import {
  fetchCandidates,
  fetchVotingDates,
  getSignerVotingContract,
  type OnChainCandidate,
} from '@/lib/votingContract'

const defaultNomStart = '2026-04-15T09:00'
const defaultNomEnd = '2026-04-20T17:00'
const defaultElectStart = '2026-04-25T09:00'
const defaultElectEnd = '2026-04-28T17:00'

export function AdminDashboard() {
  const session = getSession()
  const authed = session?.role === 'admin'

  const [candidatesOpen, setCandidatesOpen] = useState(true)
  const [nomOpen, setNomOpen] = useState(false)
  const [electOpen, setElectOpen] = useState(false)

  const [candidates, setCandidates] = useState<OnChainCandidate[]>([])
  const [chainDates, setChainDates] = useState<{ start: Date; end: Date } | null>(null)

  const [nomStart, setNomStart] = useState(defaultNomStart)
  const [nomEnd, setNomEnd] = useState(defaultNomEnd)
  const [electStart, setElectStart] = useState(defaultElectStart)
  const [electEnd, setElectEnd] = useState(defaultElectEnd)

  const [newName, setNewName] = useState('')
  const [newDept, setNewDept] = useState('')
  const [newPosition, setNewPosition] = useState('President')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [nomSavedNote, setNomSavedNote] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const [list, dates] = await Promise.all([fetchCandidates(), fetchVotingDates()])
      setCandidates(list)
      setChainDates(dates)
      if (dates) {
        const toLocal = (d: Date) => {
          const pad = (n: number) => String(n).padStart(2, '0')
          return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
        }
        setElectStart(toLocal(dates.start))
        setElectEnd(toLocal(dates.end))
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not load blockchain data')
    }
  }, [])

  useEffect(() => {
    if (!authed) return
    void refresh()
  }, [authed, refresh])

  async function addOnChain() {
    if (!newName.trim() || !newPosition) return
    setBusy(true)
    setMsg(null)
    try {
      const displayName = newDept.trim() ? `${newName.trim()} (${newDept.trim()})` : newName.trim()
      const c = getSignerVotingContract()
      const tx = await c.addCandidate(displayName, newPosition)
      await tx.wait()
      setNewName('')
      setNewDept('')
      await refresh()
      setMsg('Candidate added on-chain.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to add candidate')
    } finally {
      setBusy(false)
    }
  }

  async function saveElectionOnChain() {
    setBusy(true)
    setMsg(null)
    try {
      const startSec = Math.floor(new Date(electStart).getTime() / 1000)
      const endSec = Math.floor(new Date(electEnd).getTime() / 1000)
      const c = getSignerVotingContract()
      const tx = await c.setDates(startSec, endSec)
      await tx.wait()
      await refresh()
      setMsg('Election dates saved to the smart contract.')
    } catch (e) {
      setMsg(
        e instanceof Error
          ? e.message
          : 'Could not save dates (contract allows this only once, before voting is scheduled).',
      )
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
        {msg ? (
          <p className="rounded-lg border border-slate-200 bg-white/95 px-4 py-3 text-sm text-slate-800 backdrop-blur-sm">
            {msg}
          </p>
        ) : null}

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow backdrop-blur-sm">
          <button
            type="button"
            className="flex w-full items-center justify-between px-6 py-4 text-left font-semibold text-slate-900 transition hover:bg-slate-50"
            onClick={() => setCandidatesOpen((v) => !v)}
          >
            <span>Show Candidate List</span>
            {candidatesOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          {candidatesOpen ? (
            <div className="space-y-4 border-t border-slate-200 p-6">
              <p className="text-sm text-slate-600">
                On-chain candidates (party field is shown as post / position). Removing entries is not supported by the
                deployed contract.
              </p>
              <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-4 md:flex-row md:flex-wrap md:items-end">
                <div className="min-w-[10rem] flex-1">
                  <label className="mb-1 block text-xs font-medium text-slate-700">Full name</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Candidate name"
                  />
                </div>
                <div className="min-w-[10rem] flex-1">
                  <label className="mb-1 block text-xs font-medium text-slate-700">Department</label>
                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    placeholder="e.g. Computer Science"
                  />
                </div>
                <div className="min-w-[10rem]">
                  <label className="mb-1 block text-xs font-medium text-slate-700">Post</label>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={newPosition}
                    onChange={(e) => setNewPosition(e.target.value)}
                  >
                    {['President', 'Vice President', 'Secretary', 'Treasurer', 'Cultural Secretary', 'Sports Secretary'].map(
                      (p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void addOnChain()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                >
                  Add to blockchain
                </button>
              </div>
              <ul className="space-y-3">
                {candidates.map((c) => (
                  <li
                    key={c.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{c.name}</p>
                      <p className="text-sm text-slate-600">
                        <span className="font-medium text-slate-700">{c.party}</span>
                      </p>
                    </div>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-400"
                      onClick={() =>
                        alert(
                          'The Voting smart contract does not support removing a candidate after they are added.',
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
              {candidates.length === 0 ? <p className="text-center text-sm text-slate-500">No candidates yet.</p> : null}
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow backdrop-blur-sm">
          <button
            type="button"
            className="flex w-full items-center justify-between px-6 py-4 text-left font-semibold text-slate-900 transition hover:bg-slate-50"
            onClick={() => setNomOpen((v) => !v)}
          >
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Set Nomination Dates
            </span>
            {nomOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          {nomOpen ? (
            <div className="space-y-4 border-t border-slate-200 p-6">
              <p className="text-sm text-slate-600">
                Nomination window (UI state only — not written to the existing FastAPI or Solidity APIs).
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Start Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={nomStart}
                    onChange={(e) => setNomStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">End Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={nomEnd}
                    onChange={(e) => setNomEnd(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition hover:bg-blue-700"
                onClick={() =>
                  setNomSavedNote(`Saved (local only): ${nomStart.replace('T', ' ')} → ${nomEnd.replace('T', ' ')}`)
                }
              >
                Save
              </button>
              {nomSavedNote ? <p className="text-sm text-emerald-800">{nomSavedNote}</p> : null}
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white/95 shadow backdrop-blur-sm">
          <button
            type="button"
            className="flex w-full items-center justify-between px-6 py-4 text-left font-semibold text-slate-900 transition hover:bg-slate-50"
            onClick={() => setElectOpen((v) => !v)}
          >
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Set Election Dates
            </span>
            {electOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
          {electOpen ? (
            <div className="space-y-4 border-t border-slate-200 p-6">
              {chainDates ? (
                <p className="text-sm text-amber-800">
                  Voting is already scheduled on-chain from {chainDates.start.toLocaleString()} to{' '}
                  {chainDates.end.toLocaleString()}. The contract allows defining dates only once.
                </p>
              ) : (
                <p className="text-sm text-slate-600">
                  Saves start/end timestamps to the Voting contract (same as the legacy admin page).
                </p>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Start Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={electStart}
                    onChange={(e) => setElectStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">End Date &amp; Time</label>
                  <input
                    type="datetime-local"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={electEnd}
                    onChange={(e) => setElectEnd(e.target.value)}
                  />
                </div>
              </div>
              <button
                type="button"
                disabled={busy || !!chainDates}
                className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void saveElectionOnChain()}
              >
                Save to blockchain
              </button>
            </div>
          ) : null}
        </section>
      </div>
    </PageLayout>
  )
}
