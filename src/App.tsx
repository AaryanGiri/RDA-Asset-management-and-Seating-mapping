import { Routes, Route, Navigate } from 'react-router-dom'
import { Shell } from '@/components/Shell'
import { DashboardPage } from '@/pages/DashboardPage'
import { FloorMapPage } from '@/pages/FloorMapPage'
import { NeighborhoodPage } from '@/pages/NeighborhoodPage'
import { DirectoryPage } from '@/pages/DirectoryPage'
import { SeatingAnalyticsPage } from '@/pages/SeatingAnalyticsPage'
import { AssetsPage } from '@/pages/AssetsPage'
import { AssetPassport } from '@/pages/AssetPassport'
import { AssetRequestsPage } from '@/pages/AssetRequestsPage'
import { MySeatPage } from '@/pages/MySeatPage'
import { RequestsPage } from '@/pages/RequestsPage'
import { MeetingRoomsPage } from '@/pages/MeetingRoomsPage'
import { useData } from '@/lib/store'
import type { ReactNode } from 'react'

// Employee access is limited to their own seat, the floor map and meeting rooms.
function AdminOnly({ children }: { children: ReactNode }) {
  const role = useData((s) => s.role)
  return role === 'admin' ? <>{children}</> : <Navigate to="/my-seat" replace />
}

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/neighborhood" element={<NeighborhoodPage />} />
        <Route path="/seating" element={<FloorMapPage />} />
        <Route path="/my-seat" element={<MySeatPage />} />
        <Route path="/meeting-rooms" element={<MeetingRoomsPage />} />
        <Route path="/requests" element={<AdminOnly><RequestsPage /></AdminOnly>} />
        <Route path="/directory" element={<AdminOnly><DirectoryPage /></AdminOnly>} />
        <Route path="/seating-analytics" element={<AdminOnly><SeatingAnalyticsPage /></AdminOnly>} />
        <Route path="/assets" element={<AdminOnly><AssetsPage /></AdminOnly>} />
        <Route path="/asset-requests" element={<AdminOnly><AssetRequestsPage /></AdminOnly>} />
        <Route path="/assets/:id" element={<AdminOnly><AssetPassport /></AdminOnly>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
