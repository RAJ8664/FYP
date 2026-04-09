const loginForm = document.getElementById('loginForm')
const registerForm = document.getElementById('registerForm')
const toggleRegisterBtn = document.getElementById('toggleRegister')
const toggleLoginBtn = document.getElementById('toggleLogin')

const API_BASE = 'http://127.0.0.1:8000'

toggleRegisterBtn.addEventListener('click', () => {
  loginForm.style.display = 'none'
  registerForm.style.display = 'block'
})

toggleLoginBtn.addEventListener('click', () => {
  registerForm.style.display = 'none'
  loginForm.style.display = 'block'
})

function establishSession(token) {
  return fetch('/api/session', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault()

  const voter_id = document.getElementById('voter-id').value
  const password = document.getElementById('password').value

  fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ voter_id, password }),
  })
    .then((response) => {
      if (response.ok) {
        return response.json()
      }
      throw new Error('Login failed')
    })
    .then((data) => {
      return establishSession(data.token).then((sessionRes) => {
        if (!sessionRes.ok) {
          throw new Error('Session failed')
        }
        localStorage.removeItem('jwtTokenAdmin')
        localStorage.removeItem('jwtTokenVoter')
        localStorage.setItem('voter_id', voter_id)

        if (data.role === 'admin') {
          window.location.replace('/admin.html')
        } else if (data.role === 'user') {
          window.location.replace('/index.html')
        } else {
          throw new Error('Unknown role')
        }
      })
    })
    .catch(() => {
      alert('Invalid voter id or password')
    })
})

registerForm.addEventListener('submit', (event) => {
  event.preventDefault()

  const email = document.getElementById('reg-email').value
  const voter_id = document.getElementById('reg-voter-id').value
  const password = document.getElementById('reg-password').value
  const confirmPassword = document.getElementById('reg-confirm-password').value

  if (!email.endsWith('.nits.ac.in')) {
    alert('Email must end with .nits.ac.in')
    return
  }

  if (!/^\d{7}$/.test(voter_id)) {
    alert('Voter ID must be a 7-digit number')
    return
  }

  if (password !== confirmPassword) {
    alert('Passwords do not match')
    return
  }

  const payload = {
    voter_id: voter_id,
    email: email,
    password: password,
  }

  fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
    .then(async (response) => {
      if (response.ok) {
        alert('Registration successful! Please login.')
        registerForm.style.display = 'none'
        loginForm.style.display = 'block'
        registerForm.reset()
      } else if (response.status === 400) {
        const data = await response.json()
        alert(data.detail)
      } else {
        throw new Error('Registration failed')
      }
    })
    .catch((error) => {
      console.error('Registration error:', error)
      alert('Registration failed due to server error')
    })
})
