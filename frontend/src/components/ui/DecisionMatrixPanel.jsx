import { CheckCircle2, XCircle, AlertTriangle, Minus } from 'lucide-react';

// ─── Data ─────────────────────────────────────────────────────────────────────
// status: "pass" | "fail" | "warn" | "na"
const CRITERIA = [
  {
    id: 1,
    label: "Rendering Engine",
    echarts:  { status: "pass", text: "Canvas" },
    plotly:   { status: "warn", text: "SVG / WebGL" },
    recharts: { status: "fail", text: "SVG" },
    d3:       { status: "fail", text: "SVG" },
  },
  {
    id: 2,
    label: "AI Config Compatible",
    echarts:  { status: "pass", text: "Direct JSON" },
    plotly:   { status: "warn", text: "Needs adapter" },
    recharts: { status: "fail", text: "JSX only" },
    d3:       { status: "fail", text: "Manual code" },
  },
  {
    id: 3,
    label: "Silent Failure",
    echarts:  { status: "pass", text: "None" },
    plotly:   { status: "warn", text: "Partial render" },
    recharts: { status: "fail", text: "Drops 99% silently" },
    d3:       { status: "warn", text: "Capped at 2k" },
  },
  {
    id: 4,
    label: "Chart Type Coverage",
    echarts:  { status: "pass", text: "20+ types" },
    plotly:   { status: "pass", text: "40+ types" },
    recharts: { status: "warn", text: "~10 types" },
    d3:       { status: "pass", text: "Unlimited" },
  },
  {
    id: 5,
    label: "License & Governance",
    echarts:  { status: "pass", text: "Apache 2.0 / ASF" },
    plotly:   { status: "warn", text: "MIT / VC-backed" },
    recharts: { status: "warn", text: "MIT / Community" },
    d3:       { status: "warn", text: "BSD-3 / Observable" },
  },
  {
    id: 6,
    label: "Config-driven",
    echarts:  { status: "pass", text: "Pure JSON" },
    plotly:   { status: "warn", text: "JSON + mapping" },
    recharts: { status: "fail", text: "JSX per chart" },
    d3:       { status: "fail", text: "Imperative" },
  },
  {
    id: 7,
    label: "Bundle Size",
    echarts:  { status: "warn", text: "Tree-shakable" },
    plotly:   { status: "fail", text: "~2 MB min" },
    recharts: { status: "pass", text: "~180 KB" },
    d3:       { status: "pass", text: "~250 KB" },
  },
];

const COLS = ['echarts', 'plotly', 'recharts', 'd3'];

const COL_META = {
  echarts:  { label: 'Apache ECharts', role: 'PRIMARY',   roleColor: '#2563eb', roleBg: '#eff6ff' },
  plotly:   { label: 'Plotly.js',      role: 'Python only', roleColor: '#d97706', roleBg: '#fffbeb' },
  recharts: { label: 'Recharts',       role: 'DISQUALIFIED', roleColor: '#dc2626', roleBg: '#fef2f2' },
  d3:       { label: 'D3.js',          role: 'FALLBACK',   roleColor: '#6b7280', roleBg: '#f9fafb' },
};

const STATUS_CONFIG = {
  pass: { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', Icon: CheckCircle2 },
  fail: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca', Icon: XCircle },
  warn: { color: '#d97706', bg: '#fffbeb', border: '#fde68a', Icon: AlertTriangle },
  na:   { color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb', Icon: Minus },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ status, text }) {
  const s = STATUS_CONFIG[status] || STATUS_CONFIG.na;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 12, fontWeight: 700,
      color: s.color,
    }}>
      <s.Icon size={14} strokeWidth={2.5} />
      {text}
    </span>
  );
}

function ScoreBar({ col }) {
  const pass = CRITERIA.filter(c => c[col].status === 'pass').length;
  const total = CRITERIA.length;
  const isEcharts = col === 'echarts';
  return (
    <div style={{ marginTop: 6 }}>
      {/* bar track */}
      <div style={{
        height: 4, borderRadius: 99,
        background: '#e5e7eb', overflow: 'hidden', width: 80,
      }}>
        <div style={{
          height: '100%',
          width: `${(pass / total) * 100}%`,
          borderRadius: 99,
          background: isEcharts ? '#2563eb' : pass >= 4 ? '#16a34a' : pass >= 2 ? '#d97706' : '#dc2626',
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ fontSize: 11, color: '#6b7280', marginTop: 3, display: 'block' }}>
        {pass}/{total} passed
      </span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DecisionMatrixPanel() {
  return (
    <div style={{
      margin: '0 0 24px',
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 16,
      overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid #f3f4f6',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
          Library Comparison Matrix
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20,
          background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
        }}>
          7 R&D Criteria
        </span>
      </div>

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>

          {/* Column headers */}
          <thead>
            <tr>
              {/* empty corner */}
              <th style={{ width: '20%', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }} />
              {COLS.map(col => {
                const m = COL_META[col];
                const isMain = col === 'echarts';
                return (
                  <th key={col} style={{
                    padding: '14px 20px', textAlign: 'left',
                    background: isMain ? '#eff6ff' : '#f9fafb',
                    borderBottom: isMain ? '2px solid #2563eb' : '1px solid #e5e7eb',
                    verticalAlign: 'top',
                  }}>
                    <div style={{
                      fontSize: 13, fontWeight: 700,
                      color: isMain ? '#2563eb' : '#374151',
                    }}>
                      {m.label}
                    </div>
                    <span style={{
                      display: 'inline-block', marginTop: 4,
                      fontSize: 10, fontWeight: 700, padding: '1px 7px',
                      borderRadius: 20, letterSpacing: '0.04em',
                      background: m.roleBg, color: m.roleColor,
                      border: `1px solid ${m.roleColor}33`,
                    }}>
                      {m.role}
                    </span>
                    <ScoreBar col={col} />
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Criteria rows */}
          <tbody>
            {CRITERIA.map((row, i) => (
              <tr key={row.id} style={{
                borderBottom: '1px solid #f3f4f6',
                background: i % 2 === 0 ? '#fff' : '#fafafa',
              }}>
                {/* Criterion label */}
                <td style={{ padding: '11px 24px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: '#f3f4f6', fontSize: 10, fontWeight: 800,
                      color: '#6b7280', display: 'inline-flex',
                      alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      {row.id}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                      {row.label}
                    </span>
                  </div>
                </td>

                {/* Library badges */}
                {COLS.map(col => (
                  <td key={col} style={{
                    padding: '11px 20px', verticalAlign: 'middle',
                    background: col === 'echarts'
                      ? (i % 2 === 0 ? '#f5f9ff' : '#eef4ff')
                      : 'transparent',
                  }}>
                    <Badge status={row[col].status} text={row[col].text} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Verdict footer */}
      <div style={{
        padding: '12px 24px',
        borderTop: '1px solid #e5e7eb',
        background: '#f9fafb',
        display: 'flex', alignItems: 'flex-start', gap: 10,
      }}>
        <CheckCircle2 size={14} color="#16a34a" style={{ marginTop: 1, flexShrink: 0 }} />
        <p style={{ margin: 0, fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
          <strong style={{ color: '#111827' }}>ECharts selected as primary renderer</strong>
          {' — '}passes 5/7 criteria, the only library with no silent failures and a direct JSON config pipeline.
          {' '}
          <strong style={{ color: '#dc2626' }}>Recharts disqualified</strong>
          {' '}(dropped 99% of data silently at 50k points).
          {' '}
          <strong style={{ color: '#6b7280' }}>D3</strong> retained as fallback.
          {' '}
          <strong style={{ color: '#d97706' }}>Plotly</strong> Python-side only.
        </p>
      </div>

    </div>
  );
}
