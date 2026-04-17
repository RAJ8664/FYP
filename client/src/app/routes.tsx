import { createBrowserRouter } from 'react-router'
import { HomePage } from '../components/HomePage'
import { AdminDashboard } from '../components/AdminDashboard'
import { VoterPage } from '../components/VoterPage'
import { CandidatePage } from '../components/CandidatePage'

export const router = createBrowserRouter([
  { path: '/', Component: HomePage },
  { path: '/admin', Component: AdminDashboard },
  { path: '/voter', Component: VoterPage },
  { path: '/candidate', Component: CandidatePage },
])
