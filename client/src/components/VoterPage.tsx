import { useCallback, useEffect, useState } from 'react'
import { CheckCircle } from 'lucide-react'
import { PageLayout } from './PageLayout'
import { LoginCard } from './LoginCard'
import { getSession } from '@/lib/session'
import { listOngoingElections, submitVote, type Election } from '@/lib/api'

type ElectionSelections = Record<string, Record<string, string>>

export function VoterPage() {
  const session = getSession()
  const authed = session?.role === 'user' && !!session.voterId

  const [elections, setElections] = useState<Election[]>([])
  const [selections, setSelections] = useState<ElectionSelections>({})
  const [busyElectionId, setBusyElectionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const data = await listOngoingElections()
    setElections(data.elections)
  }, [])

  useEffect(() => {
    if (!authed) return
    void refresh().catch((err) => setError(err instanceof Error ? err.message : 'Could not load elections'))
  }, [authed, refresh])

  async function castVote(election: Election) {
    const electionSelections = selections[election.id] ?? {}
    const missing = election.positions.filter((position) => !electionSelections[position])
    if (missing.length > 0) {
      setError(`Please choose one candidate for every position before submitting: ${missing.join(', ')}`)
      return
    }

    setBusyElectionId(election.id)
    setError(null)
    setMessage(null)
    try {
      await submitVote(election.id, electionSelections)
      setMessage('Vote submitted successfully for all positions')
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Vote failed')
    } finally {
      setBusyElectionId(null)
    }
  }

  if (!authed) {
    return (
      <PageLayout showBack subtitle="Voter Portal">
        <LoginCard expectedRole="user" title="Voter login" />
      </PageLayout>
    )
  }

  return (
    <PageLayout showBack subtitle="Voter Portal">
      <div className="mx-auto max-w-4xl space-y-6">
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}
        {message ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>
        ) : null}

        {elections.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white/95 p-8 text-center shadow backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-slate-900">No ongoing elections</h2>
            <p className="mt-2 text-sm text-slate-600">Voting opens when an administrator starts an election window.</p>
          </div>
        ) : null}

        {elections.map((election) => (
          <section key={election.id} className="rounded-lg border border-slate-200 bg-white/95 p-6 shadow backdrop-blur-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">{election.title}</h2>
              <p className="text-xs text-slate-600">
                {new Date(election.startAt).toLocaleString()} - {new Date(election.endAt).toLocaleString()}
              </p>
            </div>

            {election.hasVoted ? (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
                <CheckCircle className="mr-2 inline h-5 w-5 align-text-bottom" />
                You have already voted for all positions in this election.
              </div>
            ) : (
              <>
                {election.positions.map((position) => {
                  const candidates = election.candidates.filter(
                    (candidate) => candidate.post.toLowerCase() === position.toLowerCase(),
                  )
                  const picked = selections[election.id]?.[position]
                  return (
                    <div key={`${election.id}-${position}`} className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
                      <h3 className="mb-2 text-sm font-semibold text-slate-900">{position}</h3>
                      {candidates.length === 0 ? (
                        <p className="text-sm text-amber-700">No approved candidates for this position yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {candidates.map((candidate) => (
                            <li key={candidate.id}>
                              <label
                                className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-3 transition ${
                                  picked === candidate.id
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-slate-200 bg-white hover:border-slate-300'
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`election-${election.id}-${position}`}
                                  className="h-4 w-4"
                                  checked={picked === candidate.id}
                                  onChange={() =>
                                    setSelections((prev) => ({
                                      ...prev,
                                      [election.id]: {
                                        ...(prev[election.id] ?? {}),
                                        [position]: candidate.id,
                                      },
                                    }))
                                  }
                                />
                                <img
                                  src={candidate.photoUrl}
                                  alt={candidate.fullName}
                                  className="h-10 w-10 rounded-full object-cover ring-1 ring-slate-200"
                                />
                                <div>
                                  <p className="font-medium text-slate-900">{candidate.fullName}</p>
                                  <p className="text-sm text-slate-600">
                                    {candidate.department} | Contesting for: {candidate.post}
                                  </p>
                                  {candidate.proofDocuments && candidate.proofDocuments.length > 0 ? (
                                    <div className="mt-1 flex flex-wrap gap-2">
                                      {candidate.proofDocuments.map((doc) => (
                                        <a
                                          key={`${candidate.id}-${doc.url}`}
                                          href={doc.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="rounded border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs text-indigo-700 hover:bg-indigo-100"
                                        >
                                          {doc.name}
                                        </a>
                                      ))}
                                    </div>
                                  ) : null}
                                </div>
                              </label>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )
                })}
                <button
                  type="button"
                  disabled={busyElectionId === election.id || election.positions.some((p) => !(selections[election.id]?.[p]))}
                  onClick={() => void castVote(election)}
                  className="mt-2 w-full rounded-lg bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busyElectionId === election.id ? 'Submitting…' : 'Submit all votes'}
                </button>
              </>
            )}
          </section>
        ))}
      </div>
    </PageLayout>
  )
}
