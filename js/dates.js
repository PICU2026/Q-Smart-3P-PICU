// Date helpers. Dates are 'YYYY-MM-DD' strings in local time.
export const MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export function toISO(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
export function parseISO(s) { if (!s) return null; const p = String(s).slice(0, 10).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
export function todayISO() { return toISO(new Date()); }
export function addDaysISO(s, n) { const d = parseISO(s); d.setDate(d.getDate() + n); return toISO(d); }
export function daysBetween(a, b) { return Math.round((parseISO(b) - parseISO(a)) / 86400000); }
export function daysLeft(s) { return daysBetween(todayISO(), s); }
export function thDate(s) { const d = parseISO(s); return d ? d.getDate() + ' ' + MON[d.getMonth()] + ' ' + (d.getFullYear() + 543) : '-'; }
export function thShort(s) { const d = parseISO(s); return d ? d.getDate() + ' ' + MON[d.getMonth()] + ' ' + String(d.getFullYear() + 543).slice(2) : '-'; }
export function hhmm(ts) { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

// Shifts: ดึก 00:00–07:59, เช้า 08:00–15:59, บ่าย 16:00–23:59
export const SHIFTS = [
  { k: 'ด', name: 'เวรดึก', short: 'ดึก', time: '00:00–07:59', icon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z', fill: '#E1D9FF', ink: '#5B3EBF' },
  { k: 'ช', name: 'เวรเช้า', short: 'เช้า', time: '08:00–15:59', icon: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4', fill: '#FFD25E', ink: '#B07800' },
  { k: 'บ', name: 'เวรบ่าย', short: 'บ่าย', time: '16:00–23:59', icon: 'M8 19h9a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6 1.5A2.8 2.8 0 0 0 8 19z', fill: '#FFD9B0', ink: '#C2620F' }
];
export function currentShift(d) { const h = (d || new Date()).getHours(); return h < 8 ? 'ด' : h < 16 ? 'ช' : 'บ'; }
export function shiftOf(k) { return SHIFTS.find((s) => s.k === k) || SHIFTS[1]; }
