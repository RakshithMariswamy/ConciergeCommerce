import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RoleGate from './pages/RoleGate';
import AssociateDashboard from './pages/AssociateDashboard';
import TeamLeadDashboard from './pages/TeamLeadDashboard';
import LiveShoppingDemo from './pages/LiveShoppingDemo';
import NotificationToast from './components/shared/NotificationToast';

function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-50">
        <NotificationToast />
        <Routes>
          <Route path="/"              element={<RoleGate />} />
          <Route path="/lead"          element={<TeamLeadDashboard />} />
          <Route path="/associate"     element={<AssociateDashboard />} />
          <Route path="/live-shopping" element={<LiveShoppingDemo />} />
          <Route path="*"              element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
