import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { Shield, Trophy, UserCircle, Vote, X } from 'lucide-react'
import { PageLayout } from './PageLayout'
import { fetchCandidates, fetchVotingDates, type OnChainCandidate } from '@/lib/votingContract'

const MOCK_END = new Date('2026-04-28T17:00:00')

const FALLBACK_WINNERS = [
  {
    position: 'President',
    name: 'Sarah Johnson',
    department: 'Engineering',
    votes: 1247,
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=128&h=128&fit=crop',
  },
  {
    position: 'Vice President',
    name: 'Michael Chen',
    department: 'Business',
    votes: 1134,
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop',
  },
  {
    position: 'Secretary',
    name: 'Emily Davis',
    department: 'Arts',
    votes: 1089,
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=128&h=128&fit=crop',
  },
  {
    position: 'Treasurer',
    name: 'James Wilson',
    department: 'Engineering',
    votes: 1021,
    photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=128&h=128&fit=crop',
  },
]

async function electionIsOver(): Promise<boolean> {
  try {
    const dates = await fetchVotingDates()
    if (dates) return Date.now() > dates.end.getTime()
  } catch {
    /* use mock */
  }
  return Date.now() > MOCK_END.getTime()
}

function buildResultsRows(candidates: OnChainCandidate[] | null) {
  if (!candidates || candidates.length === 0) return FALLBACK_WINNERS
  const sorted = [...candidates].sort((a, b) => b.voteCount - a.voteCount).slice(0, 4)
  const photos = FALLBACK_WINNERS.map((w) => w.photo)
  return sorted.map((c, i) => ({
    position: c.party || `Position ${i + 1}`,
    name: c.name,
    department: '—',
    votes: c.voteCount,
    photo: photos[i] ?? photos[0],
  }))
}

export function HomePage() {
  const [resultsOpen, setResultsOpen] = useState(false)
  const [resultRows, setResultRows] = useState(FALLBACK_WINNERS)
  const [loadingResults, setLoadingResults] = useState(false)

  const openResults = useCallback(async () => {
    const over = await electionIsOver()
    if (!over) {
      alert('Election not over yet')
      return
    }
    setLoadingResults(true)
    setResultsOpen(true)
    try {
      const list = await fetchCandidates()
      setResultRows(buildResultsRows(list))
    } catch {
      setResultRows(FALLBACK_WINNERS)
    } finally {
      setLoadingResults(false)
    }
  }, [])

  return (
    <PageLayout>
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-10">
        <div className="grid w-full gap-6 md:grid-cols-3">
          <Link
            to="/admin"
            className="group rounded-lg border-2 border-blue-200 bg-white/95 p-8 shadow-md backdrop-blur-sm transition hover:border-blue-500 hover:shadow-xl"
          >
            <div className="mb-4 flex justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
                <Shield className="h-8 w-8" />
              </span>
            </div>
            <h2 className="text-center text-xl font-bold text-slate-900">Admin</h2>
            <p className="mt-2 text-center text-sm text-slate-600">Manage nominations, schedule, and candidates</p>
          </Link>
          <Link
            to="/voter"
            className="group rounded-lg border-2 border-emerald-200 bg-white/95 p-8 shadow-md backdrop-blur-sm transition hover:border-emerald-500 hover:shadow-xl"
          >
            <div className="mb-4 flex justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 transition group-hover:bg-emerald-600 group-hover:text-white">
                <Vote className="h-8 w-8" />
              </span>
            </div>
            <h2 className="text-center text-xl font-bold text-slate-900">Voter</h2>
            <p className="mt-2 text-center text-sm text-slate-600">Cast your ballot during the live election window</p>
          </Link>
          <Link
            to="/candidate"
            className="group rounded-lg border-2 border-purple-200 bg-white/95 p-8 shadow-md backdrop-blur-sm transition hover:border-purple-500 hover:shadow-xl"
          >
            <div className="mb-4 flex justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-600 transition group-hover:bg-purple-600 group-hover:text-white">
                <UserCircle className="h-8 w-8" />
              </span>
            </div>
            <h2 className="text-center text-xl font-bold text-slate-900">Candidate</h2>
            <p className="mt-2 text-center text-sm text-slate-600">Submit your nomination and supporting documents</p>
          </Link>
        </div>
        <button
          type="button"
          onClick={() => void openResults()}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-8 py-3 text-lg font-semibold text-amber-950 shadow-lg transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300"
        >
          <Trophy className="h-6 w-6" />
          View Results
        </button>
      </div>

      {resultsOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            className="relative max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white p-6 shadow-2xl md:p-8"
            role="dialog"
            aria-modal="true"
            aria-labelledby="results-title"
          >
            <div className="mb-6 flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <h2 id="results-title" className="text-2xl font-bold text-slate-900">
                Election Results
              </h2>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                onClick={() => setResultsOpen(false)}
                aria-label="Close"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            {loadingResults ? (
              <p className="text-center text-slate-600">Loading results…</p>
            ) : (
              <ul className="space-y-4">
                {resultRows.map((row) => (
                  <li
                    key={row.position + row.name}
                    className="flex flex-wrap items-center gap-4 rounded-lg bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-200 p-4 shadow-md md:flex-nowrap"
                  >
                    <div className="relative shrink-0">
                      <img
                        src={row.photo}
                        alt=""
                        className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md"
                      />
                      <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-amber-600 text-white shadow">
                        <Trophy className="h-5 w-5" />
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-bold text-amber-950">{row.name}</p>
                      <p className="text-sm font-medium text-amber-900/90">{row.position}</p>
                      <p className="text-sm text-amber-950/80">{row.department}</p>
                    </div>
                    <div className="rounded-lg bg-white/90 px-4 py-2 text-center shadow">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-900/70">Votes</p>
                      <p className="text-2xl font-bold text-amber-950">{row.votes}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </PageLayout>
  )
}
