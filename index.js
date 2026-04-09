const express = require('express')
const path = require('path')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')

require('dotenv').config()

const app = express()
const COOKIE_NAME = 'auth_token'

app.use(express.json())
app.use(cookieParser())

function getTokenFromRequest(req) {
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME]
  }
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim()
  }
  const legacyQuery = req.query.Authorization?.split('Bearer ')[1]
  if (legacyQuery) {
    return legacyQuery
  }
  return null
}

const authorizeUser = (req, res, next) => {
  const token = getTokenFromRequest(req)
  if (!token) {
    return res.status(401).send('<h1 align="center"> Login to Continue </h1>')
  }
  try {
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY, {
      algorithms: ['HS256'],
    })
    req.user = decodedToken
    next()
  } catch (error) {
    return res.status(401).send('<h1 align="center"> Login to Continue </h1>')
  }
}

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res
      .status(403)
      .send('<h1 align="center"> Forbidden: admin only </h1>')
  }
  next()
}

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
  const secure = process.env.NODE_ENV === 'production'
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: secure,
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

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/login.html'))
})

app.get('/js/login.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/js/login.js'))
})

app.get('/css/login.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/css/login.css'))
})

app.get('/css/index.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/css/index.css'))
})

app.get('/css/admin.css', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/css/admin.css'))
})

app.get('/assets/background.jpg', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/assets/background.jpg'))
})

app.get('/js/app.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/js/app.js'))
})

app.get('/admin.html', authorizeUser, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/admin.html'))
})

app.get('/index.html', authorizeUser, (req, res) => {
  res.sendFile(path.join(__dirname, 'src/html/index.html'))
})

app.get('/dist/login.bundle.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/dist/login.bundle.js'))
})

app.get('/dist/app.bundle.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/dist/app.bundle.js'))
})

app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/favicon.ico'))
})

app.listen(8080, () => {
  console.log('Server listening on http://localhost:8080')
})
