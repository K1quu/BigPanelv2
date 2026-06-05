import { useState, useRef, useMemo, useEffect } from 'react';

/* ── Catmull-Rom → cubic bezier smooth path ── */
function smoothPath(pts, tension = 0.5) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) * tension / 6;
    const cp1y = p1.y + (p2.y - p0.y) * tension / 6;
    const cp2x = p2.x - (p3.x - p1.x) * tension / 6;
    const cp2y = p2.y - (p3.y - p1.y) * tension / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

/* ── Animated counter ── */
function AnimNum({ value }) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(performance.now());
  useEffect(() => {
    fromRef.current = display;
    startRef.current = performance.now();
    let raf;
    const tick = now => {
      const t = Math.min(1, (now - startRef.current) / 800);
      const e = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(fromRef.current + (value - fromRef.current) * e));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className="num">{display.toLocaleString('ru-RU')}</span>;
}

const SERIES = {
  velocity: { label: 'Velocity', lineColor: '#5ac44d', gradId: 'grad-vel', gradColor: '#5ac44d', width: 2.2, primary: true },
  lobby:    { label: 'Lobby-1',  lineColor: '#4fb3ff', gradId: 'grad-lob', gradColor: '#4fb3ff', width: 1.6, primary: false },
  game:     { label: 'Lite-1',   lineColor: '#f5b544', gradId: 'grad-gam', gradColor: '#f5b544', width: 1.6, primary: false },
};

export default function OnlineChart({ data = [], servers = ['velocity', 'lobby', 'game'] }) {
  const W = 900, H = 280;
  const PL = 48, PR = 16, PT = 16, PB = 32;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;

  const svgRef = useRef(null);
  const [hover, setHover] = useState(null);

  /* ── Group data by server and timestamp ── */
  const series = useMemo(() => {
    const map = {};
    for (const id of servers) map[id] = {};
    for (const row of data) {
      if (map[row.server_id] !== undefined) {
        map[row.server_id][row.timestamp] = row.player_count;
      }
    }
    const allTs = [...new Set(data.map(r => r.timestamp))].sort((a, b) => a - b);
    return { map, allTs };
  }, [data, servers]);

  const { map, allTs } = series;
  const N = allTs.length;

  /* ── Y scale across all series ── */
  const allVals = Object.values(map).flatMap(m => Object.values(m));
  const maxVal = Math.max(...allVals, 1);
  const yMax = Math.ceil(maxVal * 1.15);

  const toY = v => PT + innerH - (v / yMax) * innerH;
  const toX = i => PL + (i / Math.max(1, N - 1)) * innerW;

  /* ── Build per-series point arrays ── */
  const seriesPoints = useMemo(() => {
    const out = {};
    for (const id of servers) {
      out[id] = allTs.map((ts, i) => ({
        x: toX(i), y: toY(map[id][ts] ?? 0), v: map[id][ts] ?? 0, ts,
      }));
    }
    return out;
  }, [map, allTs, N, yMax]);

  /* ── Y grid ticks ── */
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    y: PT + innerH * (1 - t),
    label: Math.round(yMax * t),
  }));

  /* ── X labels ── */
  const xLabels = N < 2 ? [] : [0, Math.floor(N * 0.25), Math.floor(N * 0.5), Math.floor(N * 0.75), N - 1].map(i => ({
    x: toX(i),
    label: new Date(allTs[i] * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
  }));

  /* ── Hover ── */
  function onMove(e) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const rx = ((e.clientX - rect.left) / rect.width) * W;
    if (rx < PL || rx > W - PR) { setHover(null); return; }
    const i = Math.min(N - 1, Math.max(0, Math.round(((rx - PL) / innerW) * (N - 1))));
    const vals = {};
    for (const id of servers) vals[id] = map[id][allTs[i]] ?? 0;
    setHover({ x: toX(i), y: toY(vals[servers[0]] ?? 0), i, vals, ts: allTs[i] });
  }

  /* ── KPIs ── */
  const velVals = Object.values(map.velocity || {});
  const currentOnline = velVals.length ? velVals[velVals.length - 1] : 0;
  const peakOnline    = velVals.length ? Math.max(...velVals) : 0;
  const avgOnline     = velVals.length ? Math.round(velVals.reduce((a, b) => a + b, 0) / velVals.length) : 0;
  const prev          = velVals.length > 1 ? velVals[velVals.length - 2] : currentOnline;
  const diff          = currentOnline - prev;

  return (
    <div>
      {/* KPI row */}
      <div className="flex gap-8 mb-4">
        {[
          { label: 'Сейчас', value: currentOnline, diff },
          { label: 'Пик',    value: peakOnline },
          { label: 'Среднее',value: avgOnline },
        ].map(({ label, value, diff }) => (
          <div key={label}>
            <div className="text-[10px] text-fg-3 uppercase tracking-widest mb-1">{label}</div>
            <div className="flex items-baseline gap-2 text-xl font-bold text-fg-0">
              <AnimNum value={value} />
              {diff !== undefined && diff !== 0 && (
                <span className={`text-[11px] font-semibold font-mono px-1.5 py-0.5 rounded ${diff > 0 ? 'text-grass-bright bg-grass/10' : 'text-status-danger bg-status-danger/10'}`}>
                  {diff > 0 ? '▲' : '▼'} {Math.abs(diff)}
                </span>
              )}
            </div>
          </div>
        ))}

        {/* Legend */}
        <div className="ml-auto flex items-end gap-4 pb-0.5">
          {servers.map(id => {
            const s = SERIES[id];
            return (
              <div key={id} className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 rounded" style={{ background: s.lineColor }} />
                <span className="text-[11px] text-fg-3">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SVG chart */}
      <div className="relative w-full" style={{ height: H }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full h-full block"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          <defs>
            {servers.map(id => {
              const s = SERIES[id];
              return (
                <linearGradient key={id} id={s.gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={s.gradColor} stopOpacity={s.primary ? '0.30' : '0.15'} />
                  <stop offset="70%"  stopColor={s.gradColor} stopOpacity="0.04" />
                  <stop offset="100%" stopColor={s.gradColor} stopOpacity="0" />
                </linearGradient>
              );
            })}
            <linearGradient id="line-grad-vel" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="#4a9e3f" />
              <stop offset="50%"  stopColor="#7ee070" />
              <stop offset="100%" stopColor="#5ac44d" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-40%" width="140%" height="180%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Grid */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line x1={PL} x2={W - PR} y1={t.y} y2={t.y}
                stroke="#1e252d" strokeWidth="1"
                strokeDasharray={i === 0 ? '0' : '2 5'} />
              <text x={PL - 8} y={t.y + 3.5} fill="#5a636d" fontSize="9"
                textAnchor="end" fontFamily="JetBrains Mono, monospace">
                {t.label}
              </text>
            </g>
          ))}

          {/* X labels */}
          {xLabels.map((l, i) => (
            <text key={i} x={l.x} y={H - 8} fill="#5a636d" fontSize="9"
              textAnchor="middle" fontFamily="JetBrains Mono, monospace">
              {l.label}
            </text>
          ))}

          {/* Area fills — back to front */}
          {[...servers].reverse().map(id => {
            const pts = seriesPoints[id];
            if (!pts || pts.length < 2) return null;
            const s = SERIES[id];
            const line = smoothPath(pts, 0.9);
            const last = pts[pts.length - 1];
            const first = pts[0];
            const area = line + ` L ${last.x} ${PT + innerH} L ${first.x} ${PT + innerH} Z`;
            return <path key={id} d={area} fill={`url(#${s.gradId})`} style={{ transition: 'd 1.2s cubic-bezier(0.22,1,0.36,1)' }} />;
          })}

          {/* Lines */}
          {servers.map(id => {
            const pts = seriesPoints[id];
            if (!pts || pts.length < 2) return null;
            const s = SERIES[id];
            const line = smoothPath(pts, 0.9);
            return (
              <path key={id} d={line} fill="none"
                stroke={id === 'velocity' ? 'url(#line-grad-vel)' : s.lineColor}
                strokeWidth={s.width}
                strokeLinejoin="round" strokeLinecap="round"
                filter={s.primary ? 'url(#glow)' : undefined}
                style={{ transition: 'd 1.2s cubic-bezier(0.22,1,0.36,1)' }}
              />
            );
          })}

          {/* Live dot at last point */}
          {servers.map(id => {
            const pts = seriesPoints[id];
            if (!pts || pts.length < 1) return null;
            const s = SERIES[id];
            const last = pts[pts.length - 1];
            return (
              <g key={id}>
                {s.primary && (
                  <circle cx={last.x} cy={last.y} r="8" fill={s.lineColor} opacity="0.15">
                    <animate attributeName="r" values="5;12;5" dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.3;0;0.3" dur="2.4s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={last.x} cy={last.y} r={s.primary ? 3.5 : 2.5}
                  fill={s.lineColor} stroke="#0a0d10" strokeWidth="1.5"
                  style={{ transition: 'cx 1.2s, cy 1.2s' }} />
              </g>
            );
          })}

          {/* Hover crosshair */}
          {hover && (
            <g style={{ pointerEvents: 'none' }}>
              <line x1={hover.x} x2={hover.x} y1={PT} y2={PT + innerH}
                stroke="#7ee070" strokeWidth="1" strokeDasharray="2 4" opacity="0.5" />
              {servers.map(id => {
                const pts = seriesPoints[id];
                if (!pts?.[hover.i]) return null;
                const pt = pts[hover.i];
                return <circle key={id} cx={pt.x} cy={pt.y} r="4"
                  fill={SERIES[id].lineColor} stroke="#0a0d10" strokeWidth="1.5" />;
              })}
            </g>
          )}
        </svg>

        {/* Tooltip */}
        {hover && (
          <div className="absolute pointer-events-none bg-bg-3 border border-border-2 rounded-md px-3 py-2 text-xs shadow-xl"
            style={{
              left: `${(hover.x / W) * 100}%`,
              top: `${(Math.min(...servers.map(id => seriesPoints[id]?.[hover.i]?.y ?? 9999)) / H) * 100}%`,
              transform: 'translate(-50%, calc(-100% - 10px))',
              whiteSpace: 'nowrap',
            }}>
            <div className="text-fg-3 mb-1.5 font-mono">
              {hover.ts ? new Date(hover.ts * 1000).toLocaleTimeString('ru-RU') : ''}
            </div>
            {servers.map(id => (
              <div key={id} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: SERIES[id].lineColor }} />
                <span className="text-fg-2">{SERIES[id].label}:</span>
                <span className="text-fg-0 font-semibold">{(hover.vals[id] ?? 0).toLocaleString('ru-RU')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
