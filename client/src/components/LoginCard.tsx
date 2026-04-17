import { useState } from 'react'
import { authenticate, persistLoginSession, registerRequest } from '@/lib/api'

type LoginCardProps = {
  expectedRole: 'admin' | 'user'
  title: string
}

export function LoginCard({ expectedRole, title }: LoginCardProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [voterId, setVoterId] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const data = await authenticate(voterId, password)
      if (expectedRole === 'admin' && data.role !== 'admin') {
        setError('This portal is for administrators only.')
        return
      }
      if (expectedRole === 'user' && data.role !== 'user') {
        setError('This portal is for registered voters only.')
        return
      }
      await persistLoginSession(voterId, data.token, data.role)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setBusy(false)
    }
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.endsWith('.nits.ac.in')) {
      setError('Email must end with .nits.ac.in')
      return
    }
    if (!/^\d{7}$/.test(voterId)) {
      setError('Voter ID must be a 7-digit number')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setBusy(true)
    try {
      await registerRequest(voterId, password, email)
      alert('Registration successful! Please login.')
      setMode('login')
      setConfirm('')
      setEmail('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-md rounded-lg border border-slate-200 bg-white/95 p-8 shadow-lg backdrop-blur-sm">
      <h2 className="mb-2 text-center text-xl font-semibold text-slate-800">{title}</h2>
      <p className="mb-6 text-center text-sm text-slate-600">
        Sign in with the same voter credentials used by the FastAPI backend.
      </p>
      <div className="mb-4 flex gap-2 rounded-lg bg-slate-100 p-1">
        <button
          type="button"
          className={`flex-1 rounded-md py-2 text-sm font-medium transition ${mode === 'login' ? 'bg-white text-slate-900 shadow' : 'text-slate-600'}`}
          onClick={() => setMode('login')}
        >
          Login
        </button>
        <button
          type="button"
          className={`flex-1 rounded-md py-2 text-sm font-medium transition ${mode === 'register' ? 'bg-white text-slate-900 shadow' : 'text-slate-600'}`}
          onClick={() => setMode('register')}
        >
          Register
        </button>
      </div>
      {error ? (
        <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {mode === 'login' ? (
        <form className="space-y-4" onSubmit={onLogin}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="vid">
              Voter ID
            </label>
            <input
              id="vid"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={voterId}
              onChange={(e) => setVoterId(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="pw">
              Password
            </label>
            <input
              id="pw"
              type="password"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? 'Please wait…' : 'Continue'}
          </button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={onRegister}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="em">
              Institute email
            </label>
            <input
              id="em"
              type="email"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@nits.ac.in"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="rvid">
              Voter ID (7 digits)
            </label>
            <input
              id="rvid"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={voterId}
              onChange={(e) => setVoterId(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="rpw">
              Password
            </label>
            <input
              id="rpw"
              type="password"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="rcpw">
              Confirm password
            </label>
            <input
              id="rcpw"
              type="password"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? 'Please wait…' : 'Create account'}
          </button>
        </form>
      )}
    </div>
  )
}
