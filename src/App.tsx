import { Routes, Route, Navigate } from 'react-router-dom'
import { Shell } from '@/components/Shell'
import { Placeholder } from '@/pages/Placeholder'
import { SeatingPage } from '@/pages/SeatingPage'
import { DirectoryPage } from '@/pages/DirectoryPage'
import { SeatingAnalyticsPage } from '@/pages/SeatingAnalyticsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Placeholder title="Executive Dashboard" />} />
        <Route path="/seating" element={<SeatingPage />} />
        <Route path="/directory" element={<DirectoryPage />} />
        <Route path="/seating-analytics" element={<SeatingAnalyticsPage />} />
        <Route path="/assets" element={<Placeholder title="Asset Register" />} />
        <Route path="/assets/:id" element={<Placeholder title="Asset Passport" />} />
        <Route path="/movements" element={<Placeholder title="Asset Movements" />} />
        <Route path="/verification" element={<Placeholder title="Verification" />} />
        <Route path="/asset-analytics" element={<Placeholder title="Asset Analytics" />} />
        <Route path="/scan" element={<Placeholder title="Scan to Open" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
