const express = require('express')
const path = require('path')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const fs = require('node:fs')
const crypto = require('node:crypto')

require('dotenv').config()

const app = express()
const COOKIE_NAME = 'auth_token'
const AUTH_API_URL = process.env.AUTH_API_URL || 'http://127.0.0.1:8000'
const PORT = Number(process.env.PORT || 8080)
const ELECTION_POSITIONS = [
  'President',
  'Vice President',
  'Secretary',
  'Treasurer',
  'Cultural Secretary',
  'Sports Secretary',
]

const dataDir = path.join(__dirname, 'data')
const uploadsRootDir = path.join(__dirname, 'uploads')
const nominationUploadDir = path.join(uploadsRootDir, 'nominations')
const nominationProofUploadDir = path.join(nominationUploadDir, 'proofs')
const storePath = path.join(dataDir, 'election-workflow.json')

app.use(express.json({ limit: '12mb' }))
app.use(cookieParser())
app.use('/uploads', express.static(uploadsRootDir))

function ensureStorage() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })
  if (!fs.existsSync(nominationUploadDir)) fs.mkdirSync(nominationUploadDir, { recursive: true })
  if (!fs.existsSync(nominationProofUploadDir)) fs.mkdirSync(nominationProofUploadDir, { recursive: true })
  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(
      storePath,
      JSON.stringify({ elections: [], nominations: [], votes: [], lotDraws: [] }, null, 2),
      'utf8',
    )
  }
}

function readStore() {
  ensureStorage()
  const raw = fs.readFileSync(storePath, 'utf8')
  const parsed = JSON.parse(raw)
  return {
    elections: Array.isArray(parsed.elections) ? parsed.elections : [],
    nominations: Array.isArray(parsed.nominations) ? parsed.nominations : [],
    votes: Array.isArray(parsed.votes) ? parsed.votes : [],
    lotDraws: Array.isArray(parsed.lotDraws) ? parsed.lotDraws : [],
  }
}

function writeStore(next) {
  ensureStorage()
  fs.writeFileSync(storePath, JSON.stringify(next, null, 2), 'utf8')
}

function parseJwtFromRequest(req) {
  const bearer = req.headers.authorization
  if (typeof bearer === 'string' && bearer.startsWith('Bearer ')) {
    return bearer.slice('Bearer '.length)
  }
  return req.cookies[COOKIE_NAME]
}

function authRequired(roles = []) {
  return (req, res, next) => {
    const token = parseJwtFromRequest(req)
    if (!token) return res.status(401).json({ detail: 'Authentication required' })
    try {
      const payload = jwt.verify(token, process.env.SECRET_KEY, { algorithms: ['HS256'] })
      if (typeof payload !== 'object' || !payload) {
        return res.status(401).json({ detail: 'Invalid session token' })
      }
      if (roles.length > 0 && !roles.includes(payload.role)) {
        return res.status(403).json({ detail: 'Forbidden for this role' })
      }
      req.user = payload
      return next()
    } catch {
      return res.status(401).json({ detail: 'Invalid session token' })
    }
  }
}

function electionPhase(election, now = Date.now()) {
  const start = new Date(election.startAt).getTime()
  const end = new Date(election.endAt).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return 'invalid'
  if (now < start) return 'upcoming'
  if (now >= end) return 'completed'
  return 'ongoing'
}

function normalizePosition(position) {
  return String(position ?? '')
    .trim()
    .toLowerCase()
}

function getElectionPositions(election) {
  if (Array.isArray(election.positions) && election.positions.length > 0) {
    return election.positions.map((p) => String(p).trim()).filter(Boolean)
  }
  return [...ELECTION_POSITIONS]
}

function decodeDataUrlImage(dataUrl) {
  const m = String(dataUrl ?? '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/)
  if (!m) return null
  const mime = m[1]
  const payload = m[2]
  const extensionMap = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  const ext = extensionMap[mime]
  if (!ext) return null
  return {
    ext,
    buffer: Buffer.from(payload, 'base64'),
  }
}

function decodeDataUrlProof(dataUrl) {
  const m = String(dataUrl ?? '').match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/)
  if (!m) return null
  const mime = m[1]
  const payload = m[2]
  const extensionMap = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  }
  const ext = extensionMap[mime]
  if (!ext) return null
  return { ext, mimeType: mime, buffer: Buffer.from(payload, 'base64') }
}

function removeUploadedFileByUrl(uploadUrl) {
  const relative = String(uploadUrl ?? '')
  if (!relative.startsWith('/uploads/')) return
  const relativePath = relative.replace('/uploads/', '')
  const absolute = path.join(uploadsRootDir, relativePath)
  if (fs.existsSync(absolute)) fs.unlinkSync(absolute)
}

function buildPositionLeaderboards(approved, votes, positions) {
  const tally = new Map()
  for (const vote of votes) {
    tally.set(vote.candidateId, (tally.get(vote.candidateId) ?? 0) + 1)
  }

  return positions.map((position) => {
    const ranked = approved
      .filter((candidate) => normalizePosition(candidate.post) === normalizePosition(position))
      .map((candidate) => ({
        candidateId: candidate.id,
        fullName: candidate.fullName,
        department: candidate.department,
        post: candidate.post,
        photoUrl: candidate.photoUrl,
        votes: tally.get(candidate.id) ?? 0,
        createdAt: candidate.createdAt,
      }))
      .sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes
        return a.createdAt.localeCompare(b.createdAt)
      })

    return {
      position,
      winner: ranked[0] ?? null,
      standings: ranked,
      tieBreak: null,
    }
  })
}

function sameStringArray(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (String(a[i]) !== String(b[i])) return false
  }
  return true
}

function applyDrawingLotsToLeaderboards(store, election, positionLeaderboards) {
  if (electionPhase(election) !== 'completed') {
    return { positionLeaderboards, changed: false }
  }

  const lotDraws = Array.isArray(store.lotDraws) ? [...store.lotDraws] : []
  let changed = false

  const nextLeaderboards = positionLeaderboards.map((entry) => {
    if (!entry.winner || entry.standings.length === 0) return entry

    const topVotes = entry.standings[0].votes
    const tied = entry.standings.filter((candidate) => candidate.votes === topVotes)
    if (tied.length <= 1) return entry

    const positionKey = normalizePosition(entry.position)
    const tiedCandidateIds = tied.map((candidate) => candidate.candidateId).sort()
    const drawIndex = lotDraws.findIndex((draw) => {
      if (draw.electionId !== election.id || normalizePosition(draw.positionKey) !== positionKey) return false
      if (Number(draw.topVotes) !== Number(topVotes)) return false
      return sameStringArray(draw.tiedCandidateIds, tiedCandidateIds)
    })

    let draw = drawIndex >= 0 ? lotDraws[drawIndex] : null
    if (!draw || !tiedCandidateIds.includes(String(draw.winnerCandidateId))) {
      const winner = tied[crypto.randomInt(0, tied.length)]
      draw = {
        id: crypto.randomUUID(),
        electionId: election.id,
        position: entry.position,
        positionKey,
        topVotes,
        tiedCandidateIds,
        winnerCandidateId: winner.candidateId,
        method: 'drawing_lots',
        drawnAt: new Date().toISOString(),
      }
      for (let i = lotDraws.length - 1; i >= 0; i--) {
        if (lotDraws[i].electionId === election.id && normalizePosition(lotDraws[i].positionKey) === positionKey) {
          lotDraws.splice(i, 1)
        }
      }
      lotDraws.push(draw)
      changed = true
    }

    const winnerFromDraw = entry.standings.find(
      (candidate) => candidate.candidateId === String(draw.winnerCandidateId),
    )
    return {
      ...entry,
      winner: winnerFromDraw ?? entry.winner,
      tieBreak: {
        method: 'drawing_lots',
        wasTie: true,
        tiedCandidateCount: tied.length,
        topVotes,
        drawnAt: draw.drawnAt,
        drawId: draw.id,
      },
    }
  })

  if (changed) {
    store.lotDraws = lotDraws
  }
  return { positionLeaderboards: nextLeaderboards, changed }
}

function decorateElection(store, election, options = { includeLeaderboard: false }) {
  const positions = getElectionPositions(election)
  const approved = store.nominations.filter(
    (n) => n.status === 'approved' && n.approvedElectionId === election.id,
  )
  const electionVotes = store.votes.filter((v) => v.electionId === election.id)
  const candidates = approved.map((n) => ({
    id: n.id,
    fullName: n.fullName,
    scholarId: n.scholarId,
    department: n.department,
    post: n.post,
    cgpa: n.cgpa,
    photoUrl: n.photoUrl,
    proofDocuments: Array.isArray(n.proofDocuments) ? n.proofDocuments : [],
  }))
  const base = {
    ...election,
    positions,
    phase: electionPhase(election),
    candidates,
    candidateCount: candidates.length,
    voteCount: electionVotes.length,
  }
  if (!options.includeLeaderboard) return base
  const leaderboards = buildPositionLeaderboards(approved, electionVotes, positions)
  const withLots = applyDrawingLotsToLeaderboards(store, election, leaderboards)
  if (withLots.changed) writeStore(store)
  return {
    ...base,
    positionLeaderboards: withLots.positionLeaderboards,
  }
}

app.get('/healthz', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/session', (req, res) => {
  const token = req.body?.token
  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Missing token' })
  }
  try {
    jwt.verify(token, process.env.SECRET_KEY, { algorithms: ['HS256'] })
  } catch {
    return res.status(401).json({ message: 'Invalid token' })
  }
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 86400000,
  })
  return res.json({ ok: true })
})

app.post('/api/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' })
  res.json({ ok: true })
})

app.post('/api/nominations', (req, res) => {
  const body = req.body ?? {}
  const fullName = String(body.fullName ?? '').trim()
  const scholarId = String(body.scholarId ?? '').trim()
  const post = String(body.post ?? '').trim()
  const department = String(body.department ?? '').trim()
  const cgpa = Number(body.cgpa)
  const photoDataUrl = body.photoDataUrl
  const proofFileNames = Array.isArray(body.proofFileNames) ? body.proofFileNames.map(String) : []
  const proofFiles = Array.isArray(body.proofFiles) ? body.proofFiles : []

  if (!fullName || !scholarId || !post || !department || Number.isNaN(cgpa)) {
    return res.status(400).json({ detail: 'Missing required nomination fields' })
  }
  if (!ELECTION_POSITIONS.some((p) => normalizePosition(p) === normalizePosition(post))) {
    return res.status(400).json({ detail: 'Invalid position selected for nomination' })
  }
  if (cgpa < 0 || cgpa > 10) {
    return res.status(400).json({ detail: 'CGPA must be between 0 and 10' })
  }
  const decoded = decodeDataUrlImage(photoDataUrl)
  if (!decoded || decoded.buffer.length === 0) {
    return res.status(400).json({ detail: 'Invalid photo format. Use a JPEG/PNG/WEBP/GIF image.' })
  }

  ensureStorage()
  const nominationId = crypto.randomUUID()
  const fileName = `${nominationId}.${decoded.ext}`
  const absPath = path.join(nominationUploadDir, fileName)
  fs.writeFileSync(absPath, decoded.buffer)

  const store = readStore()
  const now = new Date().toISOString()
  const proofDocuments = []
  for (const proof of proofFiles) {
    const originalName = String(proof?.name ?? '').trim()
    const decodedProof = decodeDataUrlProof(proof?.dataUrl)
    if (!originalName || !decodedProof || decodedProof.buffer.length === 0) {
      return res.status(400).json({ detail: 'Invalid supporting document format.' })
    }
    const proofFileName = `${crypto.randomUUID()}.${decodedProof.ext}`
    fs.writeFileSync(path.join(nominationProofUploadDir, proofFileName), decodedProof.buffer)
    proofDocuments.push({
      name: originalName,
      mimeType: decodedProof.mimeType,
      url: `/uploads/nominations/proofs/${proofFileName}`,
    })
  }

  const nomination = {
    id: nominationId,
    fullName,
    scholarId,
    cgpa,
    post,
    department,
    status: 'pending',
    approvedElectionId: null,
    photoUrl: `/uploads/nominations/${fileName}`,
    proofFileNames,
    proofDocuments,
    createdAt: now,
    updatedAt: now,
  }
  store.nominations.push(nomination)
  writeStore(store)

  return res.status(201).json({ nomination })
})

app.get('/api/admin/nominations', authRequired(['admin']), (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status : null
  const store = readStore()
  const list = [...store.nominations]
    .filter((n) => (status ? n.status === status : true))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return res.json({ nominations: list })
})

app.patch('/api/admin/nominations/:nominationId', authRequired(['admin']), (req, res) => {
  const nominationId = req.params.nominationId
  const status = String(req.body?.status ?? '').trim()
  const electionId = req.body?.electionId == null ? null : String(req.body.electionId).trim()
  const allowed = new Set(['pending', 'approved', 'rejected'])
  if (!allowed.has(status)) return res.status(400).json({ detail: 'Invalid nomination status' })

  const store = readStore()
  const idx = store.nominations.findIndex((n) => n.id === nominationId)
  if (idx < 0) return res.status(404).json({ detail: 'Nomination not found' })

  const nomination = store.nominations[idx]
  nomination.status = status
  nomination.updatedAt = new Date().toISOString()

  if (status === 'approved') {
    if (!electionId) return res.status(400).json({ detail: 'electionId is required when approving' })
    const election = store.elections.find((e) => e.id === electionId)
    if (!election) return res.status(404).json({ detail: 'Election not found' })
    const electionPositions = getElectionPositions(election)
    const supportsNominationPost = electionPositions.some(
      (position) => normalizePosition(position) === normalizePosition(nomination.post),
    )
    if (!supportsNominationPost) {
      return res.status(400).json({ detail: 'Nomination position is not part of this election' })
    }
    nomination.approvedElectionId = electionId
  } else {
    nomination.approvedElectionId = null
  }

  writeStore(store)
  return res.json({ nomination })
})

app.delete('/api/admin/nominations/:nominationId', authRequired(['admin']), (req, res) => {
  const nominationId = req.params.nominationId
  const store = readStore()
  const idx = store.nominations.findIndex((n) => n.id === nominationId)
  if (idx < 0) return res.status(404).json({ detail: 'Nomination not found' })

  const [nomination] = store.nominations.splice(idx, 1)
  store.votes = store.votes.filter((v) => v.candidateId !== nominationId)

  removeUploadedFileByUrl(nomination.photoUrl)
  if (Array.isArray(nomination.proofDocuments)) {
    for (const doc of nomination.proofDocuments) {
      removeUploadedFileByUrl(doc.url)
    }
  }

  writeStore(store)
  return res.json({ deletedNominationId: nominationId })
})

app.get('/api/admin/elections', authRequired(['admin']), (_req, res) => {
  const store = readStore()
  const elections = [...store.elections]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((election) => decorateElection(store, election, { includeLeaderboard: true }))
  return res.json({ elections })
})

app.post('/api/admin/elections', authRequired(['admin']), (req, res) => {
  const body = req.body ?? {}
  const title = String(body.title ?? '').trim()
  const description = String(body.description ?? '').trim()
  const startAt = String(body.startAt ?? '').trim()
  const endAt = String(body.endAt ?? '').trim()

  if (!title || !startAt || !endAt) {
    return res.status(400).json({ detail: 'title, startAt and endAt are required' })
  }
  const startMs = new Date(startAt).getTime()
  const endMs = new Date(endAt).getTime()
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return res.status(400).json({ detail: 'startAt/endAt must be valid datetime values' })
  }
  if (endMs <= startMs) {
    return res.status(400).json({ detail: 'endAt must be after startAt' })
  }

  const store = readStore()
  const now = new Date().toISOString()
  const election = {
    id: crypto.randomUUID(),
    title,
    description,
    positions: [...ELECTION_POSITIONS],
    startAt: new Date(startMs).toISOString(),
    endAt: new Date(endMs).toISOString(),
    createdAt: now,
    updatedAt: now,
    createdBy: String(req.user.sub ?? 'admin'),
  }
  store.elections.push(election)
  writeStore(store)
  return res.status(201).json({ election: decorateElection(store, election, { includeLeaderboard: true }) })
})

app.put('/api/admin/elections/:electionId', authRequired(['admin']), (req, res) => {
  const electionId = req.params.electionId
  const body = req.body ?? {}
  const title = String(body.title ?? '').trim()
  const description = String(body.description ?? '').trim()
  const startAt = String(body.startAt ?? '').trim()
  const endAt = String(body.endAt ?? '').trim()

  if (!title || !startAt || !endAt) {
    return res.status(400).json({ detail: 'title, startAt and endAt are required' })
  }
  const startMs = new Date(startAt).getTime()
  const endMs = new Date(endAt).getTime()
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    return res.status(400).json({ detail: 'startAt/endAt must be valid datetime values' })
  }
  if (endMs <= startMs) {
    return res.status(400).json({ detail: 'endAt must be after startAt' })
  }

  const store = readStore()
  const idx = store.elections.findIndex((e) => e.id === electionId)
  if (idx < 0) return res.status(404).json({ detail: 'Election not found' })

  const election = store.elections[idx]
  election.title = title
  election.description = description
  election.positions = getElectionPositions(election)
  election.startAt = new Date(startMs).toISOString()
  election.endAt = new Date(endMs).toISOString()
  election.updatedAt = new Date().toISOString()

  writeStore(store)
  return res.json({ election: decorateElection(store, election, { includeLeaderboard: true }) })
})

app.delete('/api/admin/elections/:electionId', authRequired(['admin']), (req, res) => {
  const electionId = req.params.electionId
  const store = readStore()
  const idx = store.elections.findIndex((e) => e.id === electionId)
  if (idx < 0) return res.status(404).json({ detail: 'Election not found' })
  const [removed] = store.elections.splice(idx, 1)
  store.votes = store.votes.filter((v) => v.electionId !== electionId)
  for (const nomination of store.nominations) {
    if (nomination.approvedElectionId === electionId) {
      nomination.status = 'pending'
      nomination.approvedElectionId = null
      nomination.updatedAt = new Date().toISOString()
    }
  }
  writeStore(store)
  return res.json({ deletedElectionId: removed.id })
})

app.get('/api/elections/ongoing', authRequired(['user', 'admin']), (req, res) => {
  const store = readStore()
  const voterId = String(req.user.sub ?? '')
  const ongoing = store.elections
    .filter((election) => electionPhase(election) === 'ongoing')
    .map((election) => {
      const decorated = decorateElection(store, election)
      const votedPositions = {}
      const legacyVote = store.votes.some(
        (v) => v.electionId === election.id && v.voterId === voterId && !v.position,
      )
      for (const position of decorated.positions) {
        const hasCandidates = decorated.candidates.some(
          (candidate) => normalizePosition(candidate.post) === normalizePosition(position),
        )
        if (!hasCandidates) {
          votedPositions[position] = true
          continue
        }
        const voted = legacyVote
          ? true
          : store.votes.some(
              (v) =>
                v.electionId === election.id &&
                v.voterId === voterId &&
                normalizePosition(v.position) === normalizePosition(position),
              )
        votedPositions[position] = voted
      }
      const requiredPositions = decorated.positions.filter((position) =>
        decorated.candidates.some((candidate) => normalizePosition(candidate.post) === normalizePosition(position)),
      )
      const hasVoted = requiredPositions.every((position) => Boolean(votedPositions[position]))
      return { ...decorated, votedPositions, hasVoted }
    })
  return res.json({ elections: ongoing })
})

app.post('/api/elections/:electionId/votes', authRequired(['user']), (req, res) => {
  const electionId = req.params.electionId
  const votesByPositionRaw = req.body?.votesByPosition
  if (!votesByPositionRaw || typeof votesByPositionRaw !== 'object') {
    return res.status(400).json({ detail: 'votesByPosition is required' })
  }

  const store = readStore()
  const election = store.elections.find((e) => e.id === electionId)
  if (!election) return res.status(404).json({ detail: 'Election not found' })
  if (electionPhase(election) !== 'ongoing') {
    return res.status(400).json({ detail: 'Voting is not active for this election' })
  }
  const positions = getElectionPositions(election)
  const votesByPosition = Object.fromEntries(
    Object.entries(votesByPositionRaw).map(([position, candidateId]) => [String(position), String(candidateId)]),
  )

  const voterId = String(req.user.sub ?? '')
  if (!voterId) return res.status(401).json({ detail: 'Invalid voter session' })

  const already = store.votes.some((v) => v.electionId === electionId && v.voterId === voterId)
  if (already) return res.status(409).json({ detail: 'You already voted in this election' })

  const createdVotes = []
  for (const position of positions) {
    const approvedForPosition = store.nominations.filter(
      (n) =>
        n.status === 'approved' &&
        n.approvedElectionId === electionId &&
        normalizePosition(n.post) === normalizePosition(position),
    )
    if (approvedForPosition.length === 0) {
      continue
    }

    const candidateId = String(votesByPosition[position] ?? '').trim()
    if (!candidateId) {
      return res.status(400).json({ detail: `Missing vote for ${position}` })
    }
    const candidate = approvedForPosition.find((n) => n.id === candidateId)
    if (!candidate) {
      return res
        .status(404)
        .json({ detail: `Selected candidate for ${position} is not approved in this election` })
    }

    createdVotes.push({
      id: crypto.randomUUID(),
      electionId,
      candidateId,
      position,
      voterId,
      createdAt: new Date().toISOString(),
    })
  }
  store.votes.push(...createdVotes)
  writeStore(store)
  return res.status(201).json({ votes: createdVotes })
})

app.get('/api/results', (_req, res) => {
  const store = readStore()
  const completed = store.elections
    .filter((e) => electionPhase(e) === 'completed')
    .sort((a, b) => b.endAt.localeCompare(a.endAt))

  const results = completed.map((election) => {
    const decorated = decorateElection(store, election, { includeLeaderboard: true })
    const winnersByPosition = decorated.positionLeaderboards.map((entry) => ({
      position: entry.position,
      winner: entry.winner,
      standings: entry.standings,
      tieBreak: entry.tieBreak,
    }))
    return {
      electionId: election.id,
      title: election.title,
      startAt: election.startAt,
      endAt: election.endAt,
      positions: decorated.positions,
      winnersByPosition,
    }
  })

  return res.json({ results })
})

app.use('/api-auth', async (req, res) => {
  const targetPath = req.originalUrl.replace(/^\/api-auth/, '')
  const url = `${AUTH_API_URL}${targetPath}`
  const headers = {}
  const contentType = req.headers['content-type']
  const authorization = req.headers.authorization
  if (contentType) headers['Content-Type'] = contentType
  if (authorization) headers.Authorization = authorization

  try {
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
    const upstreamRes = await fetch(url, {
      method: req.method,
      headers,
      body: hasBody ? JSON.stringify(req.body ?? {}) : undefined,
    })

    const bodyText = await upstreamRes.text()
    const upstreamType = upstreamRes.headers.get('content-type')
    if (upstreamType) res.setHeader('Content-Type', upstreamType)
    res.status(upstreamRes.status).send(bodyText)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'FastAPI request failed'
    res.status(502).json({
      detail: `Auth service unavailable at ${AUTH_API_URL}${targetPath}: ${message}`,
    })
  }
})

const clientDistDir = path.join(__dirname, 'client', 'dist')
const clientIndexPath = path.join(clientDistDir, 'index.html')
const hasClientBuild = fs.existsSync(clientIndexPath)

if (hasClientBuild) {
  app.use(express.static(clientDistDir))
  app.get(/^(?!\/api(?:-auth)?\/).*/, (_req, res) => {
    res.sendFile(clientIndexPath)
  })
} else {
  app.get('/', (_req, res) => {
    res.status(503).send('Frontend is not built yet. Run `npm --prefix client run build`.')
  })
}

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
