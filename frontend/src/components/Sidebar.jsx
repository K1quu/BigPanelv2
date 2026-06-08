import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Server, Users, Terminal, Puzzle, Globe, LogOut, Settings, X } from 'lucide-react';
import { useAuth } from '../App';
import api from '../services/api';

const nav = [
  { to: '/',        label: 'Дашборд',  Icon: LayoutDashboard },
  { to: '/servers', label: 'Серверы',  Icon: Server },
  { to: '/players', label: 'Игроки',   Icon: Users },
  { to: '/console', label: 'Консоль',  Icon: Terminal },
  { to: '/plugins', label: 'Плагины',  Icon: Puzzle },
  { to: '/worlds',  label: 'Миры',     Icon: Globe },
  { to: '/users',   label: 'Настройки',Icon: Settings, onlySuperadmin: true },
];

const ROLE_LABEL = { superadmin: 'Супер-админ', admin: 'Администратор', moderator: 'Модератор' };

export default function Sidebar({ mobileOpen = false, onClose }) {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();

  async function logout() {
    await api.post('/auth/logout').catch(() => {});
    setUser(null);
    navigate('/login');
  }

  return (
    <aside className={`
      w-[240px] md:w-[220px] flex-shrink-0 bg-bg-1 border-r border-border-1 flex flex-col
      fixed md:sticky top-0 h-screen z-40 transition-transform duration-200
      ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
    `}>
      {/* Close button on mobile */}
      <button
        onClick={onClose}
        className="md:hidden absolute top-3 right-3 p-1.5 text-fg-2 hover:text-fg-0 rounded"
      >
        <X size={16} />
      </button>
      {/* Brand */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-border-1">
        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-grass to-grass-dim flex items-center justify-center shadow-lg">
          <span className="font-mono font-bold text-[#0a1a07] text-sm">MC</span>
        </div>
        <div>
          <div className="text-fg-0 font-semibold text-sm leading-tight">MC Panel</div>
          <div className="text-fg-3 text-[10px] font-mono">v2.0</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 flex flex-col gap-0.5">
        <div className="text-[10px] text-fg-3 uppercase tracking-widest px-2 mb-2">Навигация</div>
        {nav.filter(item => !item.onlySuperadmin || user?.role === 'superadmin').map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-sm text-[13px] transition-colors duration-100 relative
               ${isActive
                 ? 'bg-[rgba(90,196,77,0.12)] text-grass-bright before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-0.5 before:bg-grass before:rounded-sm'
                 : 'text-fg-1 hover:bg-bg-hover hover:text-fg-0'}`
            }
          >
            <Icon size={15} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-2 pb-4 pt-2 border-t border-border-1">
        <div className="flex items-center gap-3 px-3 py-2 rounded-sm">
          <div className="w-7 h-7 rounded-sm bg-gradient-to-br from-grass-dim to-[#2d5f27] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-fg-0 text-xs font-medium truncate">{user?.username}</div>
            <div className="text-fg-3 text-[10px]">{ROLE_LABEL[user?.role] || user?.role}</div>
          </div>
          <button
            onClick={logout}
            className="text-fg-3 hover:text-status-danger transition-colors"
            title="Выйти"
          >
            <LogOut size={14} />
          </button>
        </div>

        {/* Copyright footer */}
        <div className="px-3 pt-3 mt-2 border-t border-border-1 text-[9px] leading-relaxed text-fg-4 select-none cursor-default"
             title="© ООО «Биг Девелопмент». Все права защищены. Несанкционированное копирование, распространение или модификация запрещены.">
          <div className="font-medium text-fg-3/70">© ООО «Биг Девелопмент»</div>
          <div className="opacity-60 mt-0.5">Все права защищены</div>
          <div className="opacity-50 mt-0.5">Распространение запрещено</div>
        </div>
      </div>
    </aside>
  );
}
