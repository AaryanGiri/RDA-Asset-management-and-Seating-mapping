import { Routes, Route, Navigate } from 'react-router-dom'
import { Shell } from '@/components/Shell'
import { DashboardPage } from '@/pages/DashboardPage'
import { SeatingPage } from '@/pages/SeatingPage'
import { DirectoryPage } from '@/pages/DirectoryPage'
import { SeatingAnalyticsPage } from '@/pages/SeatingAnalyticsPage'
import { AssetsPage } from '@/pages/AssetsPage'
import { AssetPassport } from '@/pages/AssetPassport'
import { MovementsPage } from '@/pages/MovementsPage'
import { VerificationPage } from '@/pages/VerificationPage'
import { AssetAnalyticsPage } from '@/pages/AssetAnalyticsPage'
import { ScanPage } from '@/pages/ScanPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/seating" element={<SeatingPage />} />
        <Route path="/directory" element={<DirectoryPage />} />
        <Route path="/seating-analytics" element={<SeatingAnalyticsPage />} />
        <Route path="/assets" element={<AssetsPage />} />
        <Route path="/assets/:id" element={<AssetPassport />} />
        <Route path="/movements" element={<MovementsPage />} />
        <Route path="/verification" element={<VerificationPage />} />
        <Route path="/asset-analytics" element={<AssetAnalyticsPage />} />
        <Route path="/scan" element={<ScanPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
