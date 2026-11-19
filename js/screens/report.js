import { html, useState, useData, Icon, IC, AppBar, Nav, Spinner, ErrorBox, Overlay, toast } from '../ui.js';
import { store } from '../store.js';
import { GOALS, T, ALL_ITEMS, TOTAL, PART_OF } from '../goals.js';
import { todayISO, currentShift, SHIFTS, shiftOf, thDate, hhmm } from '../dates.js';
import { answered, partDone, failCount, assessStatus, bedLink, downloadCSV } from '../logic.js';

// ---- shared report helpers (also used by the dashboard) ----
export function cellOf(a) {
  const s = assessStatus(a);
  if (s === 'none') return { s: '–', cls: 'idle', tip: 'ยังไม่ประเมิน' };
  if (s === 'part') return { s: '◔', cls: 'warn', tip: 'ตรวจไม่ครบ' };
  return failCount(a) ? { s: '!', cls: 'bad', tip: 'มีข้อไม่ผ่าน' } : { s: '✓', cls: 'ok', tip: 'ผ่านครบ' };
}
export function goalStats(asses) {
  return GOALS.map((g, gi) => {
    let p = 0, f = 0;
    asses.forEach((a) => g.items.forEach((it) => { const r = a.results && a.results[it.id]; if (r && r.s === 'p') p++; if (r && r.s === 'f') f++; }));
    return { gi, title: g.title, short: g.short, icon: g.icon, tone: g.tone, pass: p + f ? Math.round(p / (p + f) * 100) : null, fail: f };
  });
}
const RLABEL = { p: 'ผ่าน', f: 'ไม่ผ่าน', n: 'N/A' };
export function exportCSV(fmt, asses, patients, from, to) {
  const pOf = (id) => patients.find((p) => p.id === id) || { bed: '-', code: '-' };
  const rows = asses.slice().sort((a, b) => (a.date + a.shift + pOf(a.patient_id).bed).localeCompare(b.date + b.shift + pOf(b.patient_id).bed));
  let out;
  if (fmt === 'all') {
    out = [['วันที่', 'เวร', 'เตียง', 'Code', '% ครบ', 'สถานะ', 'Part 1 (15)', 'Part 2 (21)', 'ไม่ผ่าน (ข้อ)', 'ผู้ประเมิน Part 1', 'ผู้ประเมิน Part 2', 'อัปเดตล่าสุด']];
    rows.forEach((a) => { const p = pOf(a.patient_id); const c = cellOf(a);
      out.push([a.date, shiftOf(a.shift).short, p.bed, p.code, Math.round(answered(a) / TOTAL * 100) + '%', c.tip, partDone(a, 1), partDone(a, 2), failCount(a), a.part1_by || '', a.mode === 2 ? a.part2_by || '' : '', a.updated_at ? a.updated_at.slice(0, 16).replace('T', ' ') : '']); });
  } else {
    out = [['วันที่', 'เวร', 'เตียง', 'Code'].concat(ALL_ITEMS.map((it) => 'G' + (it.gi + 1) + '.' + (it.ii + 1) + ' ' + it.t)).concat(['หมายเหตุข้อที่ไม่ผ่าน', 'ผู้ประเมิน'])];
    rows.forEach((a) => { const p = pOf(a.patient_id);
      const notes = ALL_ITEMS.filter((it) => a.results[it.id] && a.results[it.id].s === 'f').map((it) => 'G' + (it.gi + 1) + '.' + (it.ii + 1) + (a.results[it.id].note ? ': ' + a.results[it.id].note : '')).join(' | ');
      out.push([a.date, shiftOf(a.shift).short, p.bed, p.code].concat(ALL_ITEMS.map((it) => (a.results[it.id] && RLABEL[a.results[it.id].s]) || '-')).concat([notes, [a.part1_by, a.part2_by].filter(Boolean).join(', ')])); });
  }
  downloadCSV('PICU_' + (fmt === 'all' ? 'ภาพรวม' : 'รายGoal') + '_' + from + (to !== from ? '_ถึง_' + to : '') + '.csv', out);
  return rows.length;
}

export function ExportDialog({ onClose, initialFmt }) {
  const [fmt, setFmt] = useState(initialFmt || 'all');
  const [from, setFrom] = useState(todayISO()); const [to, setTo] = useState(todayISO());
  const [xs, setXs] = useState({ 'ด': true, 'ช': true, 'บ': true }); const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      const [asses, patients] = await Promise.all([store.listAssessments(from, to), store.listPatients()]);
      const n = exportCSV(fmt, asses.filter((a) => xs[a.shift]), patients, from, to);
      toast(n ? 'ดาวน์โหลดไฟล์แล้ว (' + n + ' แถว)' : 'ไม่มีข้อมูลในช่วงที่เลือก'); if (n) onClose();
    } catch (x) { toast('Export ไม่สำเร็จ: ' + x.message); } finally { setBusy(false); }
  };
  return html`<${Overlay} bottom label="Export ข้อมูล" onClose=${onClose}>
    <b class="row" style="font-size: 17px; color: var(--ok)"><${Icon} d=${IC.excel} size=${24} />Export ข้อมูล (เปิดด้วย Excel ได้)</b>
    ${[['all', 'รายงานภาพรวมทั้งหมด', 'สรุปรายเตียง: % ครบ, สถานะ, Part 1/2, ผู้ประเมิน'], ['goal', 'รายงานตาม Goal', 'แยกทุกข้อ G1–G9 (ผ่าน / ไม่ผ่าน / N/A) + หมายเหตุ']].map(([k, t, s]) => html`<label class=${'choice' + (fmt === k ? ' on' : '')} style="flex-direction: row; gap: 10px; padding: 10px; align-items: center">
      <input type="radio" name="fmt" checked=${fmt === k} onChange=${() => setFmt(k)} style="width: 20px; height: 20px; accent-color: #0B6A82" /><span><b class="small">${t}</b><br /><span class="xs muted">${s}</span></span></label>`)}
    <div class="grid2"><label class="field">ตั้งแต่<input class="input" type="date" value=${from} onChange=${(e) => setFrom(e.target.value)} /></label><label class="field">ถึง<input class="input" type="date" value=${to} onChange=${(e) => setTo(e.target.value)} /></label></div>
    <div class="row" style="gap: 6px">${SHIFTS.map((s) => html`<label class=${'chip' + (xs[s.k] ? ' on' : '')} style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px">
      <input type="checkbox" class="sr" checked=${xs[s.k]} onChange=${(e) => setXs(Object.assign({}, xs, { [s.k]: e.target.checked }))} />${xs[s.k] ? '✓ ' : ''}${s.short}</label>`)}</div>
    <div class="grid2" style="grid-template-columns: 1fr 1.6fr"><button class="btn" onClick=${onClose}>ปิด</button><button class="btn green" disabled=${busy} onClick=${run}>${busy ? 'กำลังสร้างไฟล์…' : 'Export Excel (.csv)'}</button></div>
  </${Overlay}>`;
}

export function Report({ alerts }) {
  const [tab, setTab] = useState('all');
  const [date, setDate] = useState(todayISO()); const [shift, setShift] = useState(currentShift());
  const [exp, setExp] = useState(false);
  const d = useData(() => Promise.all([store.listPatients('active'), store.listAssessments(date, date)]), [date]);
  if (d.loading && !d.data) return html`<div class="phone"><${AppBar} alerts=${alerts} /><${Spinner} /></div>`;
  if (d.error) return html`<div class="phone"><${AppBar} alerts=${alerts} /><div class="content"><${ErrorBox} error=${d.error} /></div></div>`;
  const [patients, asses] = d.data;
  const aOf = (p, s) => asses.find((a) => a.patient_id === p.id && a.shift === s);
  const cur = patients.map((p) => aOf(p, shift));
  const k = { done: 0, part: 0, fail: 0, none: 0 };
  cur.forEach((a) => { const s = assessStatus(a); k[s]++; if (failCount(a)) k.fail++; });
  const gs = goalStats(cur.filter(Boolean));
  return html`<div class="phone">
    <${AppBar} alerts=${alerts} sub="รายงานการประเมินรายเตียง" />
    <div class="content">
      <div class="seg" style="grid-template-columns: 1fr 1fr" role="tablist">
        <button role="tab" aria-selected=${tab === 'all'} class=${tab === 'all' ? 'on' : ''} onClick=${() => setTab('all')}>รายงานภาพรวมทั้งหมด</button>
        <button role="tab" aria-selected=${tab === 'goal'} class=${tab === 'goal' ? 'on' : ''} onClick=${() => setTab('goal')}>รายงานตาม Goal</button></div>
      <div class="row" style="gap: 6px"><label style="flex: 1"><span class="sr">วันที่</span><input class="input" type="date" value=${date} onChange=${(e) => setDate(e.target.value)} style="background: #fff" /></label>
        ${SHIFTS.map((s) => html`<button class=${'chip' + (shift === s.k ? ' on' : '')} style="min-height: 40px" aria-pressed=${shift === s.k} onClick=${() => setShift(s.k)}>${s.short}</button>`)}</div>
      <div class="grid4">${[['ครบแล้ว', k.done, 'ok'], ['ตรวจไม่ครบ', k.part, 'warn'], ['มีข้อไม่ผ่าน', k.fail, 'bad'], ['ยังไม่เริ่ม', k.none, 'idle']].map(([l, v, c]) => html`<div class=${c} style="border-radius: 14px; padding: 7px 4px; text-align: center"><div style="font-size: 10px">${l}</div><b style="font-size: 18px">${v} เตียง</b></div>`)}</div>
      ${tab === 'all' ? html`<section class="card" style="gap: 2px; overflow-x: auto">
          <table class="t"><thead><tr><th>เตียง</th><th style="text-align: center">ด · ช · บ</th><th>${shiftOf(shift).short}</th><th></th></tr></thead><tbody>
          ${patients.map((p) => { const a = aOf(p, shift); return html`<tr><td><b>${p.bed}</b><br /><span class="xs muted">${p.code}</span></td>
            <td style="white-space: nowrap; text-align: center">${SHIFTS.map((s) => { const c = cellOf(aOf(p, s.k)); return html`<span class=${'cell ' + c.cls} title=${s.short + ': ' + c.tip} style="margin: 0 1px">${c.s}</span>`; })}</td>
            <td><b>${Math.round(answered(a) / TOTAL * 100)}%</b></td>
            <td><a class="btn sm" href=${'#' + bedLink(p, a)}>${assessStatus(a) === 'done' ? 'ดูผล' : assessStatus(a) === 'part' ? 'ต่อ' : 'เริ่ม'}</a></td></tr>`; })}
          </tbody></table>
          <div class="xs muted" style="padding-top: 6px">✓ ผ่านครบ · ! มีข้อไม่ผ่าน · ◔ ตรวจไม่ครบ · – ยังไม่ประเมิน</div></section>`
      : html`<section class="card"><b class="small">% ผ่านราย Goal (ทุกเตียง · ${shiftOf(shift).name})</b>
          ${gs.map((g) => html`<div class="row"><span class="tile" style=${{ width: '30px', height: '30px', background: T[g.tone][0], color: T[g.tone][1] }}><${Icon} d=${g.icon} size=${16} /></span>
            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px"><div class="row xs" style="justify-content: space-between"><span>G${g.gi + 1} · ${g.short}</span><b>${g.pass == null ? '–' : g.pass + '%'}</b></div>
              <div class="bar"><span style=${{ width: (g.pass || 0) + '%' }}></span></div></div>
            <span class="xs" style=${{ width: '54px', textAlign: 'right', color: g.fail ? '#B4233C' : '#526577' }}>${g.fail ? 'ไม่ผ่าน ' + g.fail : '—'}</span></div>`)}</section>`}
      <div class="grid2" style="grid-template-columns: 1fr 1.4fr"><a class="btn" href="#/dashboard">สรุปภาพรวม (KPI)</a><button class="btn green" onClick=${() => setExp(true)}><${Icon} d=${IC.excel} />Export Excel</button></div>
    </div>
    <${Nav} active="/report" alerts=${alerts} />
    ${exp && html`<${ExportDialog} initialFmt=${tab} onClose=${() => setExp(false)} />`}
  </div>`;
}
