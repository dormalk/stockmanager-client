import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/layout/Layout'
import Portfolio from './pages/Portfolio'
import Research from './pages/Research'
import Watchlist from './pages/Watchlist'
import Compare from './pages/Compare'
import Trades from './pages/Trades'
import Settings from './pages/Settings'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Portfolio />} />
            <Route path="/research/:ticker" element={<Research />} />
            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/trades" element={<Trades />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
