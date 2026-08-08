import { Routes, Route, Navigate } from 'react-router-dom'
import { Shell } from '@/components/Shell'
import { Placeholder } from '@/pages/Placeholder'

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<Placeholder title="Executive Dashboard" />} />
        <Route path="/seating" element={<Placeholder title="Floor Map" />} />
        <Route path="/directory" element={<Placeholder title="Employee Locator" />} />
        <Route path="/seating-analytics" element={<Placeholder title="Seating Analytics" />} />
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
