import { h } from 'https://cdn.jsdelivr.net/npm/preact@10.23.1/+esm';
import { useState, useEffect, useCallback } from 'https://cdn.jsdelivr.net/npm/preact@10.23.1/hooks/+esm';
import htm from 'https://cdn.jsdelivr.net/npm/htm@3.1.1/+esm';
import { NURSE_TABLET, NURSE_WAVE, NURSE_CHEER, BED, LOGO } from './art.js';
import { store } from './store.js';

export const html = htm.bind(h);
export { useState, useEffect, useCallback };

// Router: works with normal hash URLs and inside embedded previews
export let currentPath = (location.hash || '#/').slice(1) || '/';
export function go(path, replace) {
  currentPath = path;
  try { if (replace) history.replaceState(null, '', '#' + path); else history.pushState(null, '', '#' + path); } catch (e) { /* preview frames may block */ }
  dispatchEvent(new Event('picu-route'));
}
addEventListener('popstate', () => { currentPath = (location.hash || '#/').slice(1) || '/'; dispatchEvent(new Event('picu-route')); });
addEventListener('hashchange', () => { const h = (location.hash || '#/').slice(1) || '/'; if (h !== currentPath) { currentPath = h; dispatchEvent(new Event('picu-route')); } });
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a[href^="#/"]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
  e.preventDefault(); go(a.getAttribute('href').slice(1));
});

export function Icon({ d, size = 20, stroke = 2, color = 'currentColor', fill = 'none' }) {
  return html`<svg aria-hidden="true" width=${size} height=${size} viewBox="0 0 24 24" fill=${fill} stroke=${color} stroke-width=${stroke} stroke-linecap="round" stroke-linejoin="round"><path d=${d}></path></svg>`;
}

const NURSE = { tablet: NURSE_TABLET, wave: NURSE_WAVE, cheer: NURSE_CHEER };
export function Nurse({ pose = 'tablet', w = 90, still = false }) {
  const svg = still ? NURSE[pose].replace('class="bob"', 'class=""') : NURSE[pose];
  return html`<span style=${{ flex: 'none', display: 'block', width: w + 'px', height: Math.round(w * 140 / 120) + 'px' }} dangerouslySetInnerHTML=${{ __html: svg }}></span>`;
}
export function Bed({ w = 96 }) {
  return html`<span style=${{ flex: 'none', display: 'block', width: w + 'px', height: Math.round(w * 84 / 130) + 'px' }} dangerouslySetInnerHTML=${{ __html: BED }}></span>`;
}
export function Logo() { return html`<span class="logo" dangerouslySetInnerHTML=${{ __html: LOGO }}></span>`; }

export const IC = {
  back: 'M15 18l-6-6 6-6', next: 'M9 6l6 6-6 6', bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
  home: 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z', clip: 'M5 4h14v17H5zM9 4h6v3H9zM9 12l2 2 4-4',
  steth: 'M6 3v5a4 4 0 0 0 8 0V3M10 12v3a5 5 0 0 0 10 0v-2M20 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  bed: 'M3 18V7M3 13h18v5M21 18v-3M6 10h4v3', check: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12l3 3 5-6', clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  warn: 'M12 3l10 18H2zM12 10v5M12 18h.01', minus: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12h8', x: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9l6 6M15 9l-6 6',
  play: 'M7 4l12 8-12 8z', search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4', cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  user: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1.5-4 5-6 8-6s6.5 2 8 6', users: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM3 20c0-3.5 3-6 6-6s6 2.5 6 6M19 8v6M16 11h6',
  lock: 'M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3M12 15v2', excel: 'M6 3h9l4 4v14H6zM14 3v5h5M9 11l5 6M14 11l-5 6',
  logout: 'M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5M10 17l-5-5 5-5M5 12h11', login: 'M10 17l5-5-5-5M15 12H3M14 4h5a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-5',
  pen: 'M4 20h4L19 9l-4-4L4 16z', refresh: 'M20 11a8 8 0 0 0-14.6-4.5M4 4v3h3M4 13a8 8 0 0 0 14.6 4.5M20 20v-3h-3', plus: 'M12 5v14M5 12h14',
  book: 'M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1zM12 6v14', video: 'M3 5h18v14H3zM10 9l5 3-5 3z',
  eye: 'M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.5 9.5 0 0 1 12 5c5 0 9 4.5 10 7a13 13 0 0 1-3 4M6.1 6.1C3.9 7.6 2.6 9.8 2 12c1 2.5 5 7 10 7 1.7 0 3.2-.5 4.6-1.2',
  pin: 'M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z'
};

export function AppBar({ sub = 'ระบบประเมินความปลอดภัยผู้ป่วยวิกฤตเด็ก (PICU)', title = 'Q-Smart 3P PICU', back, alerts = 0, right }) {
  return html`<header class="appbar">
    ${back && html`<a class="iconbtn" href=${'#' + back} aria-label="ย้อนกลับ"><${Icon} d=${IC.back} /></a>`}
    <${Logo} />
    <div class="t"><b>${title}</b><small>${sub}</small></div>
    ${right}
    <a class="iconbtn" href="#/alerts" aria-label=${'การแจ้งเตือน ' + alerts + ' รายการ'}>
      <${Icon} d=${IC.bell} size=${21} fill="#FFD25E" color="#fff" stroke=${1.6} />
      ${alerts > 0 && html`<span class="badge pulse">${alerts}</span>`}
    </a>
  </header>`;
}

const NAV = [['/', 'หน้าหลัก', IC.home], ['/start', 'ประเมิน', IC.clip], ['/devices', 'อุปกรณ์', IC.steth], ['/alerts', 'แจ้งเตือน', IC.bell], ['/report', 'รายงาน', IC.chart]];
export function Nav({ active, alerts = 0 }) {
  return html`<nav class="nav" aria-label="เมนูหลัก">
    <div class="nav-brand"><span class="logo" style="width: 42px; height: 42px; border-radius: 13px; background: var(--teal-l); display: flex; align-items: center; justify-content: center" dangerouslySetInnerHTML=${{ __html: LOGO }}></span><span><b>Q-Smart 3P PICU</b><small>Skin & Safety Assessment</small></span></div>
    ${NAV.map(([href, label, icon]) => html`<a href=${'#' + href} class=${active === href ? 'on' : ''} aria-current=${active === href ? 'page' : undefined}>
      <${Icon} d=${icon} size=${22} />${label}${href === '/alerts' && alerts > 0 && html`<span class="badge">${alerts}</span>`}</a>`)}
    <a href="#/patients" class="desk-only"><${Icon} d=${IC.users} size=${22} />จัดการผู้ป่วย</a>
    <a href="#/dashboard" class=${'desk-only' + (active === '/dashboard' ? ' on' : '')}><${Icon} d=${IC.chart} size=${22} />Dashboard (KPI)</a>
    <div class="nav-foot">ทุกจุดคือความเสี่ยง<br />เช็คให้ครบ ปลอดภัยกว่า <span style="color: #F0365A">♥</span></div>
  </nav>`;
}

export function Overlay({ children, bottom, label, onClose }) {
  useEffect(() => {
    const k = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  }, [onClose]);
  return html`<div class=${'overlay' + (bottom ? ' bottom' : '')} onClick=${(e) => { if (e.target === e.currentTarget && onClose) onClose(); }}>
    <div class="dialog pop" role="dialog" aria-modal="true" aria-label=${label}>${children}</div></div>`;
}

let toastSet = null;
export function Toaster() {
  const [msg, setMsg] = useState('');
  useEffect(() => { toastSet = setMsg; }, []);
  useEffect(() => { if (!msg) return; const t = setTimeout(() => setMsg(''), 2800); return () => clearTimeout(t); }, [msg]);
  return msg ? html`<div class="toast pop" role="status">${msg}</div>` : null;
}
export function toast(m) { if (toastSet) toastSet(m); }

export function Spinner() { return html`<div class="spinner" role="status" aria-label="กำลังโหลด"></div>`; }

// Load async data with a reload() callback
export function useData(fn, deps) {
  const [state, set] = useState({ loading: true, data: null, error: null });
  const load = useCallback(() => {
    set((s) => Object.assign({}, s, { loading: true }));
    return fn().then((data) => set({ loading: false, data, error: null })).catch((error) => set({ loading: false, data: null, error }));
  }, deps || []);
  useEffect(() => { load(); }, [load]);
  return Object.assign({}, state, { reload: load });
}

export function ErrorBox({ error }) {
  return html`<div class="alertbox bad" role="alert"><${Icon} d=${IC.warn} />เกิดข้อผิดพลาด: ${String(error && error.message || error)}</div>`;
}

export function DemoBanner() {
  return store.mode === 'demo' ? html`<div class="demo">โหมดทดลอง · ข้อมูลเก็บในเครื่องนี้เท่านั้น (ยังไม่ได้เชื่อม Supabase)</div>` : null;
}
