const express = require('express')
const path = require('path')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const fs = require('node:fs')

require('dotenv').config()

const app = express()
const COOKIE_NAME = 'auth_token'
const AUTH_API_URL = process.env.AUTH_API_URL || 'http://127.0.0.1:8000'
const PORT = Number(process.env.PORT || 8080)

app.use(express.json())
app.use(cookieParser())

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
