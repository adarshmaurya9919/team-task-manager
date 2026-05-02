import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedLayout from './components/ProtectedLayout';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Admin from './pages/Admin';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: { background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)' }
        }} />
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/projects" element={<ProtectedLayout><Projects /></ProtectedLayout>} />
          <Route path="/projects/:id" element={<ProtectedLayout><ProjectDetail /></ProtectedLayout>} />
          <Route path="/admin" element={<ProtectedLayout><Admin /></ProtectedLayout>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
