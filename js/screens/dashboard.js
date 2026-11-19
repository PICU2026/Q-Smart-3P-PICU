import { html, useState, useData, Icon, IC, Nurse, Bed, Logo, Nav, Spinner, ErrorBox } from '../ui.js';
import { store } from '../store.js';
import { T, TOTAL } from '../goals.js';
import { todayISO, addDaysISO, currentShift, SHIFTS, shiftOf, thDate } from '../dates.js';
import { answered, failCount, assessStatus, devStatus } from '../logic.js';
import { cellOf, goalStats, ExportDialog } from './report.js';

export function Dashboard({ user, alerts }) {
  const [p, setP] = useState(7); const [exp, setExp] = useState(null);
  const today = todayISO(); const from = addDaysISO(today, -(p - 1)); const shift = currentShift();
  const d = useData(() => Promise.all([store.listPatients('active'), store.listAssessments(from, today), store.listActiveDevices()]), [from]);
  const head = html`<header class="appbar" style="display: block">
    <div style="max-width: 1240px; margin: 0 auto; display: flex; flex-wrap: wrap; align-items: center; gap: 12px">
      <a href="#/" class="iconbtn" aria-label="กลับหน้าหลัก"><${Icon} d=${IC.back} /></a>
      <${Logo} />
      <div style="flex: 1 1 280px"><h1 style="font-size: clamp(17px, 2.4vw, 22px)">รายงานภาพรวม (KPI) · Q-Smart 3P PICU</h1><div class="small" style="color: #E2F6F8">ข้อมูล ${thDate(from)} – ${thDate(today)} · ผู้ใช้ ${user.name}</div></div>
      <div class="seg" style="grid-template-columns: repeat(3, auto); background: rgba(255,255,255,.18); box-shadow: none">
        ${[[1, 'วันนี้'], [7, '7 วัน'], [30, '30 วัน']].map(([k, l]) => html`<button class=${p === k ? 'on' : ''} style=${{ padding: '0 16px', color: p === k ? '#0B5E73' : '#fff', background: p === k ? '#fff' : 'transparent' }} aria-pressed=${p === k} onClick=${() => setP(k)}>${l}</button>`)}</div>
    </div></header>`;
  const nav = html`<${Nav} active="/dashboard" alerts=${alerts} />`;
  if (d.loading && !d.data) return html`<div class="phone">${head}<${Spinner} />${nav}</div>`;
  if (d.error) return html`<div class="phone">${head}<div class="content"><${ErrorBox} error=${d.error} /></div>${nav}</div>`;
  const [patients, asses, devs] = d.data;
  const doneN = asses.filter((a) => assessStatus(a) === 'done').length;
  const fails = asses.reduce((s, a) => s + failCount(a), 0);
  const soon = devs.filter((x) => devStatus(x) === 'soon').length; const expd = devs.filter((x) => devStatus(x) === 'exp').length;
  const todayA = asses.filter((a) => a.date === today);
  const bedsDone = patients.filter((pt) => assessStatus(todayA.find((a) => a.patient_id === pt.id && a.shift === shift)) === 'done').length;
  const kpis = [
    ['แบบประเมินที่ทำครบ', asses.length ? Math.round(doneN / asses.length * 100) + '%' : '–', doneN + ' / ' + asses.length + ' แบบ', 'info', IC.check],
    ['ข้อที่ไม่ผ่าน', fails, 'ข้อ (ทุก Goal)', 'bad', IC.x],
    ['อุปกรณ์ใกล้หมดอายุ', soon, 'ภายใน 1 วัน', 'warn', IC.clock],
    ['อุปกรณ์หมดอายุแล้ว', expd, 'ต้องติดตาม', 'bad', IC.warn],
    ['เตียงประเมินครบ (' + shiftOf(shift).short + ')', bedsDone + '/' + patients.length, 'วันนี้', 'blue', IC.bed]
  ];
  const gs = goalStats(asses);
  return html`<div class="phone">${head}
    <main class="content">
      <section class="hero" style="padding: 14px 24px 0; flex-wrap: wrap; gap: 18px; border-radius: 26px">
        <${Nurse} pose="cheer" w=${120} />
        <div style="flex: 1 1 300px; padding-bottom: 18px; display: flex; flex-direction: column; gap: 6px">
          <b style="font-size: 22px; color: var(--teal-d)">สวัสดีค่ะ ${user.name}</b>
          <div class="small">${shiftOf(shift).name}ประเมินครบ ${bedsDone} จาก ${patients.length} เตียง · อุปกรณ์ใกล้หมดอายุ ${soon} · หมดอายุแล้ว ${expd}</div>
          <div class="bubble" style="align-self: flex-start; font-weight: 600; color: var(--teal)">ทุกจุดคือความเสี่ยง เช็คให้ครบ ปลอดภัยกว่า <span style="color: #F0365A">♥</span></div></div>
        <div class="desk-only" style="padding-bottom: 10px"><${Bed} w=${170} /></div></section>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px">
        ${kpis.map(([l, v, n, c, icon]) => html`<div class="card" style="flex-direction: row; align-items: center; gap: 14px; padding: 16px">
          <span class=${'tile ' + c} style="width: 52px; height: 52px; border-radius: 16px"><${Icon} d=${icon} size=${26} /></span>
          <span><span class="small muted">${l}</span><br /><b style="font-size: 28px">${v}</b><br /><span class="xs muted">${n}</span></span></div>`)}</div>
      <div style="display: flex; flex-wrap: wrap; gap: 18px">
        <section class="card" style="flex: 1 1 340px; min-width: 0; padding: 18px"><h2>รายงานตาม Goal · % ข้อที่ผ่าน</h2>
          ${gs.map((g) => html`<div class="row" title=${'G' + (g.gi + 1) + ' ผ่าน ' + (g.pass == null ? '-' : g.pass + '%')}>
            <span class="tile" style=${{ width: '34px', height: '34px', background: T[g.tone][0], color: T[g.tone][1] }}><${Icon} d=${g.icon} size=${18} /></span>
            <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px"><div class="row small" style="justify-content: space-between"><span>G${g.gi + 1} · ${g.title}</span><b>${g.pass == null ? '–' : g.pass + '%'}</b></div>
              <div class="bar" style="height: 10px"><span style=${{ width: (g.pass || 0) + '%' }}></span></div></div>
            <span class="xs" style=${{ width: '64px', textAlign: 'right', color: g.fail ? '#B4233C' : '#526577' }}>${g.fail ? 'ไม่ผ่าน ' + g.fail : '—'}</span></div>`)}
          <button class="btn sm green" style="align-self: flex-start" onClick=${() => setExp('goal')}><${Icon} d=${IC.excel} size=${16} />Export รายงานตาม Goal</button></section>
        <section class="card" style="flex: 1 1 340px; min-width: 0; padding: 18px">
          <div class="row" style="justify-content: space-between; flex-wrap: wrap"><h2>รายงานภาพรวม · รายเตียง × เวร (วันนี้)</h2><span class="xs muted">✓ ครบ · ! มีข้อไม่ผ่าน · ◔ ไม่ครบ · – ยังไม่ประเมิน</span></div>
          <div style="overflow-x: auto"><table class="t" style="min-width: 460px"><thead><tr><th>เตียง</th><th>Code</th>${SHIFTS.map((s) => html`<th style="text-align: center">${s.short}</th>`)}<th>% ครบ (${shiftOf(shift).short})</th></tr></thead><tbody>
            ${patients.map((pt) => { const aOf = (k) => todayA.find((a) => a.patient_id === pt.id && a.shift === k); const pct = Math.round(answered(aOf(shift)) / TOTAL * 100);
              return html`<tr><td><b>${pt.bed}</b></td><td>${pt.code}</td>${SHIFTS.map((s) => { const c = cellOf(aOf(s.k)); return html`<td style="text-align: center"><span class=${'cell ' + c.cls} title=${c.tip}>${c.s}</span></td>`; })}
                <td><div class="row"><div class="bar" style="width: 90px"><span style=${{ width: pct + '%' }}></span></div>${pct}%</div></td></tr>`; })}
          </tbody></table></div>
          <button class="btn sm green" style="align-self: flex-start" onClick=${() => setExp('all')}><${Icon} d=${IC.excel} size=${16} />Export รายงานภาพรวม</button></section>
      </div>
    </main>
    ${nav}
    ${exp && html`<${ExportDialog} initialFmt=${exp} onClose=${() => setExp(null)} />`}
  </div>`;
}
