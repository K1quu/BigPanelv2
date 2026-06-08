import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Wifi, WifiOff, Cpu, MemoryStick, Activity,
  Network, HardDrive, Clock, Signal, Puzzle, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import api from '../services/api';
import { connectWS, disconnectWS, onMessage } from '../services/websocket';
import MiniChart from '../components/MiniChart';

function fmtSize(mb) {
  if (mb === undefined || mb === null) return '—';
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

function fmtKbps(kb) {
  if (kb >= 1024) return `${(kb / 1024).toFixed(2)} MB/s`;
  return `${kb} KB/s`;
}

function fmtUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}д ${h}ч ${m}м`;
  if (h > 0) return `${h}ч ${m}м`;
  return `${m}м`;
}

function pctColor(p) {
  if (p < 60) return 'text-grass-bright';
  if (p < 80) return 'text-status-warn';
  return 'text-status-danger';
}
function barColor(p) {
  if (p < 60) return 'linear-gradient(90deg, #4a9e3f, #7ee070)';
  if (p < 80) return 'linear-gradient(90deg, #d49b30, #f5b544)';
  return 'linear-gradient(90deg, #c94343, #ef6464)';
}

function StatCard({ label, value, suffix, Icon, color = 'text-fg-0' }) {
  return (
    <div className="bg-bg-1 border border-border-1 rounded-lg p-4 hover:border-border-2 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="text-fg-2 text-xs font-medium">{label}</span>
        <Icon size={14} className="text-fg-3" />
      </div>
      <div className={`text-2xl font-bold num ${color}`}>
        {value ?? '—'}
        {suffix && <span className="text-fg-3 text-sm font-normal ml-1">{suffix}</span>}
      </div>
    </div>
  );
}

export default function ServerDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const r = await api.get(`/servers/${id}/details?range=3600`);
      setData(r.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    connectWS();
    const off = onMessage(msg => {
      if (msg.type === 'tick') load();
    });
    return () => { off(); disconnectWS(); };
  }, [id]);

  if (loading || !data) {
    return (
      <div className="p-8 flex items-center justify-center h-screen">
        <div className="w-5 h-5 border-2 border-fg-3 border-t-grass rounded-full animate-spin-me" />
      </div>
    );
  }

  const { server, plugins, network, uptime, avgPing, history } = data;
  const h = server.health || {};

  const heapPct = h.heapTotalMb ? (h.heapUsedMb / h.heapTotalMb) * 100 : 0;
  const ramPct  = h.ramTotalMb  ? (h.ramUsedMb  / h.ramTotalMb)  * 100 : 0;
  const tpsCls  = !server.tps ? 'text-fg-3' : server.tps >= 18 ? 'text-grass-bright' : server.tps >= 12 ? 'text-status-warn' : 'text-status-danger';

  return (
    <div className="p-4 md:p-8 w-full animate-fade-in">
      {/* Breadcrumb */}
      <Link to="/servers"
        className="inline-flex items-center gap-1.5 text-fg-3 hover:text-fg-1 text-xs mb-3 transition-colors">
        <ArrowLeft size={12} />
        Назад к серверам
      </Link>

      {/* Header */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-md flex items-center justify-center text-base font-bold font-mono
            ${server.type === 'proxy' ? 'bg-[rgba(79,179,255,0.15)] text-status-info' : 'bg-[rgba(90,196,77,0.15)] text-grass-bright'}`}>
            {server.name[0]}
          </div>
          <div>
            <h1 className="text-fg-0 text-xl font-semibold tracking-tight">{server.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`flex items-center gap-1.5 text-xs font-medium ${server.online ? 'text-grass' : 'text-status-danger'}`}>
                {server.online ? <Wifi size={11} /> : <WifiOff size={11} />}
                {server.online ? 'Online' : 'Offline'}
              </span>
              {server.version && <span className="text-fg-3 text-xs font-mono">{server.version}</span>}
            </div>
          </div>
        </div>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Игроки" value={server.players?.toLocaleString('ru-RU')} suffix={`/ ${server.maxPlayers || '—'}`} Icon={Signal} color="text-grass-bright" />
        <StatCard label="TPS" value={server.tps?.toFixed(1)} Icon={Activity} color={tpsCls} />
        <StatCard label="MSPT" value={h.msptMedian?.toFixed(1)} suffix="ms" Icon={Activity} color="text-fg-0" />
        <StatCard label="CPU" value={h.cpuProcess?.toFixed(0)} suffix="%" Icon={Cpu} color={pctColor(h.cpuProcess || 0)} />
        <StatCard label="Средний пинг" value={avgPing?.toFixed(0)} suffix="ms" Icon={Network} color="text-status-info" />
        <StatCard label="Uptime" value={fmtUptime(uptime || 0)} Icon={Clock} color="text-fg-0" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MiniChart
          data={(history?.tps || []).map(p => ({ t: p.t, v: p.v }))}
          color="#5ac44d"
          label="TPS (1ч)"
          min={0} max={20}
        />
        <MiniChart
          data={(history?.mspt || []).map(p => ({ t: p.t, v: p.v }))}
          color="#4fb3ff"
          label="MSPT (1ч)"
          suffix="ms"
          min={0}
        />
        <MiniChart
          data={(history?.cpuProcess || []).map(p => ({ t: p.t, v: p.v }))}
          color="#f5b544"
          label="CPU процесса (1ч)"
          suffix="%"
          min={0} max={100}
        />
        <MiniChart
          data={(history?.heapPct || []).map(p => ({ t: p.t, v: p.v }))}
          color="#e063e0"
          label="JVM Heap (1ч)"
          suffix="%"
          min={0} max={100}
        />
      </div>

      {/* Memory + Network */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <div className="bg-bg-1 border border-border-1 rounded-lg p-5">
          <div className="text-fg-2 text-xs font-medium mb-4">Память</div>

          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-2 text-fg-2"><MemoryStick size={12} /> JVM Heap</div>
              <span className={`font-semibold num ${pctColor(heapPct)}`}>{heapPct.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-bg-3 rounded-full overflow-hidden mb-1">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${heapPct}%`, background: barColor(heapPct) }} />
            </div>
            <div className="text-fg-3 text-[11px] font-mono">{fmtSize(h.heapUsedMb)} / {fmtSize(h.heapTotalMb)}</div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <div className="flex items-center gap-2 text-fg-2"><HardDrive size={12} /> Системная RAM</div>
              <span className={`font-semibold num ${pctColor(ramPct)}`}>{ramPct.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-bg-3 rounded-full overflow-hidden mb-1">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${ramPct}%`, background: barColor(ramPct) }} />
            </div>
            <div className="text-fg-3 text-[11px] font-mono">{fmtSize(h.ramUsedMb)} / {fmtSize(h.ramTotalMb)}</div>
          </div>
        </div>

        <div className="bg-bg-1 border border-border-1 rounded-lg p-5">
          <div className="text-fg-2 text-xs font-medium mb-4">Сеть</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-bg-2 rounded-md px-4 py-3">
              <div className="flex items-center gap-1.5 text-fg-3 text-[10px] uppercase tracking-wider mb-1">
                <ArrowDownLeft size={11} className="text-status-info" /> Входящий
              </div>
              <div className="text-fg-0 text-lg font-bold num">{fmtKbps(network?.rxKbps || 0)}</div>
            </div>
            <div className="bg-bg-2 rounded-md px-4 py-3">
              <div className="flex items-center gap-1.5 text-fg-3 text-[10px] uppercase tracking-wider mb-1">
                <ArrowUpRight size={11} className="text-grass-bright" /> Исходящий
              </div>
              <div className="text-fg-0 text-lg font-bold num">{fmtKbps(network?.txKbps || 0)}</div>
            </div>
          </div>
          <div className="mt-4 text-fg-3 text-[11px] font-mono">
            ~{network?.perPlayerKbps?.toFixed(1)} KB/s на игрока · {server.players} игроков
          </div>
        </div>
      </div>

      {/* Plugins CPU breakdown */}
      <div className="bg-bg-1 border border-border-1 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-1">
          <div className="flex items-center gap-2 text-fg-0 font-semibold text-sm">
            <Puzzle size={14} className="text-grass" />
            Нагрузка по плагинам
          </div>
          <div className="text-fg-3 text-xs">Top {plugins.length}</div>
        </div>
        <div className="divide-y divide-border-1">
          {plugins.map((p, i) => {
            const maxCpu = Math.max(...plugins.map(x => x.cpuPercent));
            const pct = (p.cpuPercent / maxCpu) * 100;
            return (
              <div key={i} className="flex items-center gap-4 px-5 py-3 hover:bg-bg-hover transition-colors">
                <div className="w-5 text-fg-3 text-xs font-mono text-right">{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span className="text-fg-0 text-sm font-medium truncate">{p.name}</span>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-fg-3 text-[11px] font-mono">{fmtSize(p.memMb)}</span>
                      <span className="text-fg-0 text-sm font-semibold num min-w-[55px] text-right">
                        {p.cpuPercent.toFixed(2)}<span className="text-fg-3 text-xs">%</span>
                      </span>
                    </div>
                  </div>
                  <div className="h-1 bg-bg-3 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #4a9e3f, #7ee070)' }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
