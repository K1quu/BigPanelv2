import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { createContext, useContext, useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import api from './services/api';
import Sidebar from './components/Sidebar';
import Logo from './components/Logo';
import Login    from './pages/Login';
import Dashboard from './pages/Dashboard';
import Servers   from './pages/Servers';
import Players   from './pages/Players';
import Console   from './pages/Console';
import Plugins   from './pages/Plugins';
import Worlds    from './pages/Worlds';
import Users     from './pages/Users';

export const AuthCtx = createContext(null);
export function useAuth() { return useContext(AuthCtx); }

function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => { setOpen(false); }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-bg-0">
      <Sidebar mobileOpen={open} onClose={() => setOpen(false)} />

      {/* Mobile backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 animate-fade-in"
        />
      )}

      <main className="flex-1 min-w-0 overflow-auto">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between px-4 h-12 border-b border-border-1 bg-bg-1 sticky top-0 z-20">
          <button
            onClick={() => setOpen(true)}
            className="p-1.5 rounded text-fg-1 hover:bg-bg-hover"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-2">
            <Logo size={22} className="text-grass-bright" />
            <span className="text-fg-0 font-semibold text-sm">MC Panel</span>
          </div>
          <div className="w-7" />
        </div>

        {children}
      </main>
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
                  <Route path="/worlds"  element={<Worlds />} />
                  <Route path="/users"   element={<Users />} />
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
