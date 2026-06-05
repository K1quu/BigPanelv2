import { useState, useRef, useEffect } from 'react';
import { Send, ChevronRight } from 'lucide-react';
import api from '../services/api';

export default function ConsoleTerminal({ serverId }) {
  const [lines, setLines] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Load recent log on mount / server change
  useEffect(() => {
    if (!serverId) return;
    setLines([]);
    api.get(`/console/log?server_id=${serverId}&limit=30`)
      .then(r => {
        const loaded = [...r.data].reverse().flatMap(row => [
          { kind: 'cmd', text: row.command, user: row.admin_user },
          { kind: 'resp', text: row.response || '' },
        ]);
        setLines(loaded);
      })
      .catch(() => {});
  }, [serverId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  async function send(e) {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd || loading) return;

    setHistory(h => [cmd, ...h.slice(0, 49)]);
    setHistIdx(-1);
    setInput('');
    setLines(l => [...l, { kind: 'cmd', text: cmd }]);
    setLoading(true);

    try {
      const r = await api.post('/console/command', { server_id: serverId, command: cmd });
      setLines(l => [...l, { kind: 'resp', text: r.data.response || '(нет ответа)' }]);
    } catch (err) {
      setLines(l => [...l, { kind: 'err', text: err.response?.data?.error || 'Ошибка' }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = Math.min(histIdx + 1, history.length - 1);
      setHistIdx(next);
      setInput(history[next] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = histIdx - 1;
      if (next < 0) { setHistIdx(-1); setInput(''); }
      else { setHistIdx(next); setInput(history[next]); }
    }
  }

  return (
    <div className="flex flex-col h-full bg-bg-0 rounded-lg overflow-hidden border border-border-2">
      {/* Output */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed min-h-0">
        {lines.length === 0 && (
          <div className="text-fg-3 text-center py-8">Введите команду ниже</div>
        )}
        {lines.map((line, i) => (
          <div key={i} className={`mb-0.5 ${line.kind === 'cmd' ? 'text-grass-bright' : line.kind === 'err' ? 'text-status-danger' : 'text-fg-2'}`}>
            {line.kind === 'cmd' && (
              <><span className="text-fg-3">
                {line.user && <span className="text-fg-4 mr-1">[{line.user}]</span>}
                <ChevronRight size={11} className="inline mr-1" />
              </span>{line.text}</>
            )}
            {line.kind !== 'cmd' && (
              <span className="pl-4 whitespace-pre-wrap break-all">{line.text}</span>
            )}
          </div>
        ))}
        {loading && (
          <div className="text-fg-3 animate-pulse pl-4">...</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={send} className="flex items-center gap-3 px-4 py-3 border-t border-border-1 bg-bg-1">
        <ChevronRight size={14} className="text-grass flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          className="flex-1 bg-transparent border-0 outline-none text-fg-0 text-xs font-mono placeholder:text-fg-3"
          placeholder={serverId ? `Команда для ${serverId}...` : 'Выберите сервер'}
          disabled={!serverId || loading}
          autoFocus
        />
        <button
          type="submit"
          disabled={!serverId || !input.trim() || loading}
          className="flex items-center justify-center w-7 h-7 rounded bg-grass/20 text-grass-bright hover:bg-grass/30 disabled:opacity-30 transition-colors"
        >
          <Send size={12} />
        </button>
      </form>
    </div>
  );
}
