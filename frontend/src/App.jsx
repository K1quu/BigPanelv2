import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { createContext, useContext, useState, useEffect } from 'react';
import api from './services/api';
import Sidebar from './components/Sidebar';
import Login    from './pages/Login';
import Dashboard from './pages/Dashboard';
import Servers   from './pages/Servers';
import Players   from './pages/Players';
import Console   from './pages/Console';
import Plugins   from './pages/Plugins';

export const AuthCtx = createContext(null);
export function useAuth() { return useContext(AuthCtx); }

function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-bg-0">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}

function Guard({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-bg-0">
      <div className="w-5 h-5 border-2 border-fg-3 border-t-grass rounded-full animate-spin-me" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me')
      .then(r => setUser(r.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AuthCtx.Provider value={{ user, setUser, loading }}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <Guard>
              <Layout>
                <Routes>
                  <Route path="/"        element={<Dashboard />} />
                  <Route path="/servers" element={<Servers />} />
                  <Route path="/players" element={<Players />} />
                  <Route path="/console" element={<Console />} />
                  <Route path="/plugins" element={<Plugins />} />
                  <Route path="*"        element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </Guard>
          } />
        </Routes>
      </BrowserRouter>
    </AuthCtx.Provider>
  );
}
