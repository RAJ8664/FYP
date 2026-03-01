const loginForm = document.getElementById('loginForm')
const registerForm = document.getElementById('registerForm')
const toggleRegisterBtn = document.getElementById('toggleRegister')
const toggleLoginBtn = document.getElementById('toggleLogin')

toggleRegisterBtn.addEventListener('click', () => {
  loginForm.style.display = 'none'
  registerForm.style.display = 'block'
})

toggleLoginBtn.addEventListener('click', () => {
  registerForm.style.display = 'none'
  loginForm.style.display = 'block'
})

loginForm.addEventListener('submit', (event) => {
  event.preventDefault()

  const voter_id = document.getElementById('voter-id').value
  const password = document.getElementById('password').value
  const token = voter_id

  const headers = {
    method: 'GET',
    Authorization: `Bearer ${token}`,
  }

  fetch(`http://127.0.0.1:8000/login?voter_id=${voter_id}&password=${password}`, { headers })
    .then((response) => {
      if (response.ok) {
        return response.json()
      } else {
        throw new Error('Login failed')
      }
    })
    .then((data) => {
      localStorage.setItem('voter_id', voter_id)

      if (data.role === 'admin') {
        console.log(data.role)
        localStorage.setItem('jwtTokenAdmin', data.token)
        window.location.replace(
          `/admin.html?Authorization=Bearer ${localStorage.getItem('jwtTokenAdmin')}`,
        )
      } else if (data.role === 'user') {
        localStorage.setItem('jwtTokenVoter', data.token)
        window.location.replace(
          `/index.html?Authorization=Bearer ${localStorage.getItem('jwtTokenVoter')}`,
        )
      }
    })
    .catch((error) => {
      console.error('Login failed:', error.message)
      alert('Login failed: Invalid voter id or password')
    })
})

registerForm.addEventListener('submit', (event) => {
  event.preventDefault()

  const email = document.getElementById('reg-email').value
  const voter_id = document.getElementById('reg-voter-id').value
  const password = document.getElementById('reg-password').value
  const confirmPassword = document.getElementById('reg-confirm-password').value

  // Validations
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

  fetch('http://127.0.0.1:8000/register', {
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
        alert(data.detail) // "user already registered pls login"
      } else {
        throw new Error('Registration failed')
      }
    })
    .catch((error) => {
      console.error('Registration error:', error)
      alert('Registration failed due to server error')
    })
})
