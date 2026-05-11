import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { Shield, Trophy, UserCircle, Vote, X } from 'lucide-react'
import { PageLayout } from './PageLayout'
import { listCompletedResults, type ElectionResult } from '@/lib/api'

export function HomePage() {
  const [resultsOpen, setResultsOpen] = useState(false)
  const [loadingResults, setLoadingResults] = useState(false)
  const [results, setResults] = useState<ElectionResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const openResults = useCallback(async () => {
    setResultsOpen(true)
    setLoadingResults(true)
    setError(null)
    try {
      const response = await listCompletedResults()
      setResults(response.results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load results')
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
            <p className="mt-2 text-center text-sm text-slate-600">Create and manage elections and nominee approvals</p>
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
            <p className="mt-2 text-center text-sm text-slate-600">Vote in currently ongoing elections</p>
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
            <p className="mt-2 text-center text-sm text-slate-600">Submit nomination with profile photo</p>
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

            {loadingResults ? <p className="text-center text-slate-600">Loading results…</p> : null}
            {error ? <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
            {!loadingResults && !error && results.length === 0 ? (
              <p className="text-center text-slate-600">No completed election results yet.</p>
            ) : null}

            {!loadingResults && !error && results.length > 0 ? (
              <ul className="space-y-4">
                {results.map((result) => (
                  <li key={result.electionId} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900">{result.title}</p>
                    <p className="mb-3 text-xs text-amber-800">{result.position}</p>
                    {result.winner ? (
                      <div className="flex flex-wrap items-center gap-4 rounded-lg bg-white p-4 shadow-sm">
                        <img
                          src={result.winner.photoUrl}
                          alt={result.winner.fullName}
                          className="h-20 w-20 rounded-full object-cover ring-2 ring-amber-200"
                        />
                        <div className="flex-1">
                          <p className="text-lg font-bold text-slate-900">{result.winner.fullName}</p>
                          <p className="text-sm text-slate-700">{result.winner.department}</p>
                        </div>
                        <div className="rounded-lg bg-amber-100 px-4 py-2 text-center">
                          <p className="text-xs font-semibold uppercase text-amber-900">Votes</p>
                          <p className="text-2xl font-bold text-amber-950">{result.winner.votes}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600">No winner data available.</p>
                    )}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      ) : null}
    </PageLayout>
  )
}
