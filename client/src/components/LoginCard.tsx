import { useState } from 'react'
import { authenticate, persistLoginSession, requestRegistrationOtp, verifyRegistrationOtp } from '@/lib/api'

type LoginCardProps = {
  expectedRole: 'admin' | 'user'
  title: string
}

export function LoginCard({ expectedRole, title }: LoginCardProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'verify'>('login')
  const [voterId, setVoterId] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const nitsEmailPattern = /^[a-z0-9._%+-]+@[a-z0-9-]+\.nits\.ac\.in$/i

  async function onLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
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
    setMessage(null)
    if (!nitsEmailPattern.test(email.trim())) {
      setError('Use your NIT Silchar email format, e.g. rajk_ug_22@cse.nits.ac.in')
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
      const res = await requestRegistrationOtp(voterId.trim(), password, email.trim().toLowerCase())
      setMessage(res.message)
      setMode('verify')
      setConfirm('')
      setOtp('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setBusy(false)
    }
  }

  async function onVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)
    if (!/^\d{6}$/.test(otp.trim())) {
      setError('OTP must be a 6-digit number')
      return
    }
    setBusy(true)
    try {
      const res = await verifyRegistrationOtp(voterId.trim(), email.trim().toLowerCase(), otp.trim())
      setMessage(res.message)
      setMode('login')
      setPassword('')
      setConfirm('')
      setOtp('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OTP verification failed')
    } finally {
      setBusy(false)
    }
  }

  async function onResendOtp() {
    setError(null)
    setMessage(null)
    setBusy(true)
    try {
      const res = await requestRegistrationOtp(voterId.trim(), password, email.trim().toLowerCase())
      setMessage(res.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend OTP')
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
        {expectedRole == 'user' && (
          <button
            type="button"
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${mode !== 'login' ? 'bg-white text-slate-900 shadow' : 'text-slate-600'}`}
            onClick={() => setMode('register')}
          >
            Register
          </button>
        )}
      </div>
      {message ? (
        <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">
          {message}
        </p>
      ) : null}
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
      ) : mode === 'register' ? (
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
              placeholder="rajk_ug_22@cse.nits.ac.in"
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
            {busy ? 'Please wait…' : 'Send OTP'}
          </button>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={onVerifyOtp}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="v-email">
              Institute email
            </label>
            <input
              id="v-email"
              type="email"
              className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-slate-900 focus:outline-none"
              value={email}
              readOnly
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="otp">
              OTP
            </label>
            <input
              id="otp"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="6-digit OTP"
              required
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-blue-600 py-2.5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          >
            {busy ? 'Please wait…' : 'Verify and create account'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void onResendOtp()}
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Resend OTP
          </button>
        </form>
      )}
    </div>
  )
}
