import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Layout/Sidebar';
import TopBar from './components/Layout/TopBar';
import SecurityDashboard from './pages/SecurityDashboard';
import FinancialDashboard from './pages/FinancialDashboard';
import Findings from './pages/Findings';
import Assets from './pages/Assets';
import Risks from './pages/Risks';
import Scenarios from './pages/Scenarios';
import Investments from './pages/Investments';
import Compliance from './pages/Compliance';

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
        <Sidebar />
        <div style={{ flex: 1, marginLeft: 240, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <TopBar />
          <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/security" replace />} />
              <Route path="/security" element={<SecurityDashboard />} />
              <Route path="/financial" element={<FinancialDashboard />} />
              <Route path="/findings" element={<Findings />} />
              <Route path="/assets" element={<Assets />} />
              <Route path="/risks" element={<Risks />} />
              <Route path="/scenarios" element={<Scenarios />} />
              <Route path="/investments" element={<Investments />} />
              <Route path="/compliance" element={<Compliance />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
