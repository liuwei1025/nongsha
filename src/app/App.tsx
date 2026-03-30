import { Navigate, Route, Routes } from 'react-router-dom'

import { Shell } from '@/components/Shell'
import { CapturePage } from '@/pages/CapturePage'
import { HomePage } from '@/pages/HomePage'
import { ReportPage } from '@/pages/ReportPage'

export function App() {
  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/capture" element={<CapturePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </Shell>
  )
}
