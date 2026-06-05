import { useState } from 'react';
import { useAuth } from '../App';
import ConsoleTerminal from '../components/ConsoleTerminal';

const SERVERS = [
  { id: 'lobby', label: 'Lobby-1' },
  { id: 'game',  label: 'Lite-1'  },
];

const ROLE_RANK = { moderator: 1, admin: 2, superadmin: 3 };

export default function Console() {
  const { user } = useAuth();
  const [serverId, setServerId] = useState('lobby');

  if ((ROLE_RANK[user?.role] || 0) < ROLE_RANK.admin) {
    return (
      <div className="p-8 flex items-center justify-center h-full animate-fade-in">
        <div className="text-center">
          <div className="text-fg-3 text-4xl mb-4">🔒</div>
          <div className="text-fg-1 font-semibold">Недостаточно прав</div>
          <div className="text-fg-3 text-sm mt-1">Консоль доступна только администраторам</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 w-full animate-fade-in flex flex-col" style={{ height: '100vh' }}>
      <div className="flex items-end justify-between mb-5">
        <div>
          <h1 className="text-fg-0 text-xl font-semibold tracking-tight">RCON Консоль</h1>
          <p className="text-fg-3 text-xs mt-1">Прямое выполнение команд на серверах</p>
        </div>

        <div className="flex gap-1">
          {SERVERS.map(s => (
            <button
              key={s.id}
              onClick={() => setServerId(s.id)}
              className={`px-4 py-2 text-sm rounded-md transition-colors
                ${serverId === s.id ? 'bg-bg-3 text-fg-0 border border-border-2' : 'text-fg-2 hover:text-fg-0 border border-transparent hover:bg-bg-hover'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0" style={{ height: 'calc(100vh - 160px)' }}>
        <ConsoleTerminal serverId={serverId} />
      </div>
    </div>
  );
}
