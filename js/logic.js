// Shared business rules
import { ALL_ITEMS, TOTAL, PART_OF, DEV_TYPES } from './goals.js';
import { daysLeft, thShort, addDaysISO } from './dates.js';

export function answered(a) { return a && a.results ? ALL_ITEMS.filter((it) => a.results[it.id] && a.results[it.id].s).length : 0; }
export function partDone(a, p) { return a && a.results ? ALL_ITEMS.filter((it) => PART_OF[it.gi] === p && a.results[it.id] && a.results[it.id].s).length : 0; }
export function failCount(a) { return a && a.results ? ALL_ITEMS.filter((it) => a.results[it.id] && a.results[it.id].s === 'f').length : 0; }
export function assessStatus(a) { const n = answered(a); return n === 0 ? 'none' : n >= TOTAL ? 'done' : 'part'; }
export const ST = {
  done: { label: 'ครบแล้ว', cls: 'ok', stripe: '#17663A', act: 'ดูผล' },
  part: { label: 'ยังไม่ครบ', cls: 'warn', stripe: '#C27A00', act: 'ประเมินต่อ' },
  none: { label: 'ยังไม่เริ่มประเมิน', cls: 'idle', stripe: '#8A9BAA', act: 'เริ่มประเมิน' }
};
// Where the bed-row button goes for a given status
export function bedLink(p, a) {
  const s = assessStatus(a);
  if (s === 'done') return '/result/' + a.id;
  if (s === 'part') return '/parts/' + a.id;
  return '/start?p=' + p.id;
}

// Device Exp date (null = no Exp)
export function expOf(d) {
  if (d.no_exp) return null;
  if (d.exp_date) return d.exp_date;
  const t = DEV_TYPES[d.type];
  return t && t.life > 0 && d.start_date ? addDaysISO(d.start_date, t.life) : null;
}
export function devStatus(d) {
  if (d.removed_at) return 'removed';
  const e = expOf(d);
  if (!e) return 'noexp';
  const l = daysLeft(e);
  return l < 0 ? 'exp' : l <= 1 ? 'soon' : 'ok';
}
export const DST = { ok: ['ใช้งาน', 'ok'], soon: ['ใกล้หมดอายุ', 'warn'], exp: ['หมดอายุ', 'bad'], removed: ['ถอดแล้ว', 'idle'], noexp: ['ไม่มีวัน Exp', 'blue'] };
export function dueText(d) {
  const s = devStatus(d);
  if (s === 'removed') return 'ถอดแล้ว ' + thShort(d.removed_at);
  if (s === 'noexp') return d.type === 'fc' && !d.no_exp ? 'Start ' + thShort(d.start_date) + ' (ไม่กำหนด Exp)' : 'ไม่มีวัน Exp';
  const e = expOf(d); const l = daysLeft(e);
  return 'หมดอายุ ' + thShort(e) + (l < 0 ? ' (เกิน ' + -l + ' วัน)' : l === 0 ? ' (วันนี้)' : ' (อีก ' + l + ' วัน)');
}

// CSV download (opens in Excel; BOM keeps Thai readable)
export function downloadCSV(name, rows) {
  const esc = (v) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const text = '﻿' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
