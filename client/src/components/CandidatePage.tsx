import { useCallback, useEffect, useState } from 'react'
import { CheckCircle, Upload, X } from 'lucide-react'
import { PageLayout } from './PageLayout'
import { LoginCard } from './LoginCard'
import { submitNomination } from '@/lib/api'
import { getSession } from '@/lib/session'

const POST_OPTIONS = [
  'President',
  'Vice President',
  'Secretary',
  'Treasurer',
  'Cultural Secretary',
  'Sports Secretary',
] as const

export function CandidatePage() {
  const session = getSession()
  const authed = session?.role === 'user' && !!session.voterId

  const [fullName, setFullName] = useState('')
  const [scholarId, setScholarId] = useState(session?.voterId ?? '')
  const [cgpa, setCgpa] = useState('')
  const [post, setPost] = useState<(typeof POST_OPTIONS)[number]>('President')
  const [department, setDepartment] = useState('')
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [proofFiles, setProofFiles] = useState<File[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onPhotoChange = (f: File | null) => {
    setPhoto(f)
    if (photoPreview) URL.revokeObjectURL(photoPreview)
    setPhotoPreview(f ? URL.createObjectURL(f) : null)
  }

  useEffect(() => {
    return () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    }
  }, [photoPreview])

  const addProofFiles = useCallback((files: FileList | File[]) => {
    setProofFiles((prev) => {
      const next = [...prev]
      for (const file of Array.from(files)) {
        const ok =
          file.type === 'application/pdf' ||
          file.type === 'application/msword' ||
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.type.startsWith('image/')
        if (ok) next.push(file)
      }
      return next
    })
  }, [])

  const removeProof = (index: number) => {
    setProofFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') resolve(reader.result)
        else reject(new Error('Could not read image'))
      }
      reader.onerror = () => reject(new Error('Could not read image'))
      reader.readAsDataURL(file)
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!authed || !session) {
      setError('Please login as a registered voter first.')
      return
    }
    if (!photo) return
    setError(null)
    setBusy(true)
    try {
      const normalizedScholarId = session.voterId.trim()
      setScholarId(normalizedScholarId)
      const photoDataUrl = await fileToDataUrl(photo)
      const proofPayload = await Promise.all(
        proofFiles.map(async (file) => ({
          name: file.name,
          dataUrl: await fileToDataUrl(file),
        })),
      )
      await submitNomination({
        fullName: fullName.trim(),
        scholarId: normalizedScholarId,
        cgpa: Number(cgpa),
        post,
        department: department.trim(),
        photoDataUrl,
        proofFileNames: proofFiles.map((f) => f.name),
        proofFiles: proofPayload,
      })
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit nomination')
    } finally {
      setBusy(false)
    }
  }

  if (submitted) {
    return (
      <PageLayout showBack subtitle="Candidate Portal">
        <div className="mx-auto max-w-lg rounded-lg border border-emerald-200 bg-white/95 p-8 text-center shadow backdrop-blur-sm">
          <CheckCircle className="mx-auto mb-4 h-14 w-14 text-emerald-600" />
          <h2 className="text-2xl font-bold text-slate-900">Nomination Submitted Successfully!</h2>
          <p className="mt-2 text-slate-600">Your nomination is under review.</p>
          <p className="mt-4 text-sm text-slate-500">Your nomination is now saved for admin review.</p>
        </div>
      </PageLayout>
    )
  }

  if (!authed) {
    return (
      <PageLayout showBack subtitle="Candidate Portal">
        <LoginCard expectedRole="user" title="Candidate login" />
      </PageLayout>
    )
  }

  return (
    <PageLayout showBack subtitle="Candidate Portal">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-xl space-y-6 rounded-lg border border-slate-200 bg-white/95 p-8 shadow backdrop-blur-sm"
      >
        {error ? (
          <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="fn">
            Full Name <span className="text-red-600">*</span>
          </label>
          <input
            id="fn"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="sid">
            Scholar ID <span className="text-red-600">*</span>
          </label>
          <input
            id="sid"
            required
            readOnly
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={scholarId}
          />
          <p className="mt-1 text-xs text-slate-500">
            Scholar ID is locked to your logged-in voter account.
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="cgpa">
            CGPA (0–10) <span className="text-red-600">*</span>
          </label>
          <input
            id="cgpa"
            type="number"
            min={0}
            max={10}
            step={0.01}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={cgpa}
            onChange={(e) => setCgpa(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="post">
            Post Standing For <span className="text-red-600">*</span>
          </label>
          <select
            id="post"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={post}
            onChange={(e) => setPost(e.target.value as (typeof POST_OPTIONS)[number])}
          >
            {POST_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="dept">
            Department <span className="text-red-600">*</span>
          </label>
          <input
            id="dept"
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="ph">
            Photo <span className="text-red-600">*</span>
          </label>
          <input
            id="ph"
            type="file"
            accept="image/*"
            required
            className="w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-purple-100 file:px-4 file:py-2 file:font-medium file:text-purple-800"
            onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
          />
          {photoPreview ? (
            <img
              src={photoPreview}
              alt=""
              className="mt-3 h-8 w-8 rounded-md object-cover ring-2 ring-purple-200"
            />
          ) : null}
        </div>
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">
            Proof of Contribution (multiple files)
          </p>
          <div
            className={`rounded-lg border-2 border-dashed p-8 text-center transition ${
              dragOver ? 'border-purple-500 bg-purple-50/80' : 'border-slate-300 bg-slate-50/80'
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              addProofFiles(e.dataTransfer.files)
            }}
          >
            <Upload className="mx-auto mb-2 h-8 w-8 text-slate-400" />
            <p className="text-sm text-slate-600">Drag and drop PDF, DOC/DOCX, or images</p>
            <label className="mt-3 inline-block cursor-pointer rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500">
              Browse files
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,image/*"
                className="hidden"
                onChange={(e) => e.target.files && addProofFiles(e.target.files)}
              />
            </label>
          </div>
          {proofFiles.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {proofFiles.map((f, i) => (
                <li
                  key={`${f.name}-${i}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <span className="truncate text-slate-800">{f.name}</span>
                  <button
                    type="button"
                    className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-red-600"
                    onClick={() => removeProof(i)}
                    aria-label="Remove file"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-purple-600 py-3 font-semibold text-white transition hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400"
        >
          {busy ? 'Submitting…' : 'Submit nomination'}
        </button>
      </form>
    </PageLayout>
  )
}
