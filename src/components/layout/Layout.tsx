import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import './Layout.css'

export default function Layout() {
  const isMobile = useMediaQuery('(max-width: 767px)')

  return (
    <div className="layout">
      <Sidebar />
      <div className="layout__content">
        <Outlet />
      </div>
      {isMobile && <BottomNav />}
    </div>
  )
}
