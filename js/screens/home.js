import { html, useState, useData, Icon, IC, Nurse, Bed, AppBar, Nav, Spinner, ErrorBox, DemoBanner, go } from '../ui.js';
import { store } from '../store.js';
import { todayISO, currentShift, shiftOf, thDate } from '../dates.js';
import { assessStatus, ST, bedLink, partDone, devStatus } from '../logic.js';

export function Home({ user, alerts, onLogout }) {
  const date = todayISO(); const shift = currentShift(); const sh = shiftOf(shift);
  const [q, setQ] = useState(''); const [all, setAll] = useState(() => typeof matchMedia === 'function' && matchMedia('(min-width: 900px)').matches);
  const d = useData(() => Promise.all([store.listPatients('active'), store.listAssessments(date, date), store.listActiveDevices()]), [date]);
  if (d.loading && !d.data) return html`<div class="phone"><${AppBar} alerts=${alerts} /><${Spinner} /></div>`;
  if (d.error) return html`<div class="phone"><${AppBar} alerts=${alerts} /><div class="content"><${ErrorBox} error=${d.error} /></div></div>`;
  const [patients, asses, devices] = d.data;
  const aOf = (p) => asses.find((a) => a.patient_id === p.id && a.shift === shift);
  const done = patients.filter((p) => assessStatus(aOf(p)) === 'done').length;
  const soon = devices.filter((x) => devStatus(x) === 'soon').length;
  const exp = devices.filter((x) => devStatus(x) === 'exp').length;
  const ql = q.trim().toLowerCase();
  const list = patients.filter((p) => !ql || p.code.toLowerCase().includes(ql) || p.bed.includes(ql));
  const shown = all || ql ? list : list.slice(0, 5);
  const stats = [
    ['ผู้ป่วยที่รักษา', patients.length, 'ราย', 'blue', IC.bed, '/patients'],
    ['ประเมินครบ', done, 'ราย', 'ok', IC.check, '/report'],
    ['ยังไม่ครบ', patients.length - done, 'ราย', 'warn', IC.clock, '/start'],
    ['ใกล้หมดอายุ (EXP)', soon, 'รายการ', 'bad', IC.warn, '/devices']
  ];
  const menu = [['จัดการผู้ป่วย', '/patients', IC.users, 'blue'], ['รับผู้ป่วยใหม่', '/admit', IC.plus, 'ok'], ['รายงาน (KPI)', '/dashboard', IC.chart, 'info'], ['Export (Excel)', '/report', IC.excel, 'ok']];
  const menuAlert = (cls) => html`<div class=${cls} style="display: flex; flex-direction: column; gap: 12px">
      <div class="grid4">
        ${menu.map(([label, href, icon, cls]) => html`<a href=${'#' + href} class="card" style="padding: 8px 2px; align-items: center; gap: 4px; text-decoration: none; text-align: center">
          <span class=${'tile ' + cls}><${Icon} d=${icon} /></span><span style="font-size: 10.5px; font-weight: 600; color: var(--ink)">${label}</span></a>`)}
      </div>
      ${(soon + exp) > 0 && html`<a href="#/alerts" class="alertbox warn" style="text-decoration: none; border: 1.5px solid #F2D08A">
        <${Icon} d=${IC.bell} size=${26} color="#C2410C" /><span style="flex: 1"><b style="color: var(--bad)">แจ้งเตือนสำคัญ</b><br />อุปกรณ์ใกล้หมดอายุ ${soon} รายการ · หมดอายุแล้ว ${exp}</span><${Icon} d=${IC.next} /></a>`}
  </div>`;
  return html`<div class="phone">
    <${AppBar} alerts=${alerts} right=${html`<button class="iconbtn" aria-label="ออกจากระบบ" onClick=${onLogout}><${Icon} d=${IC.logout} /></button>`} />
    <${DemoBanner} />
    <div class="content split even">
      <div class="side">
      <section class="hero">
        <${Nurse} pose="tablet" w=${92} />
        <div style="flex: 1; min-width: 0; padding-bottom: 12px"><div class="bubble pop">
          <div style="font-size: 16px; font-weight: 700; color: var(--teal-d)">สวัสดีค่ะ ${user.name}</div>
          <div class="small">เช็คจุดเสี่ยง ป้องกันได้ก่อนเกิด <span style="color: #F0365A">♥</span></div></div></div>
        <div style="align-self: center"><${Bed} w=${92} /></div>
      </section>
      <div class="row" style="flex-wrap: wrap; gap: 6px">
        <span class="pill info" style="font-size: 12px; padding: 5px 10px"><${Icon} d=${IC.cal} size=${14} />${thDate(date)}</span>
        <span class="pill warn" style="font-size: 12px; padding: 5px 10px">${sh.name} ${sh.time} น.</span>
        <button class="pill ok" style="border: none; font-size: 12px; padding: 5px 10px" onClick=${d.reload}><${Icon} d=${IC.refresh} size=${13} />อัปเดตข้อมูล</button>
      </div>
      <div class="grid4 stats">
        ${stats.map(([label, v, unit, cls, icon, href]) => html`<a class=${'stat ' + cls} href=${'#' + href}>
          <${Icon} d=${icon} size=${24} /><span style="font-size: 10.5px; color: var(--ink); line-height: 1.25">${label}</span><b>${v} <small style="font-size: 10.5px; font-weight: 500">${unit}</small></b></a>`)}
      </div>
      <div class="xs muted" style="margin-top: -6px">ใกล้หมดอายุ = เตือนล่วงหน้า 1 วัน${exp ? ' · หมดอายุแล้ว ' + exp + ' รายการ' : ''}</div>
      ${menuAlert('desk-only')}
      </div>
      <div class="main">
      <section class="card">
        <div class="row">
          <h2 style="flex: 1" class="row"><${Icon} d=${IC.bed} color="#0B6A82" />สถานะรายเตียง (${patients.length} เตียง)</h2>
          <label class="row" style="gap: 4px; width: 150px; height: 36px; border: 1.5px solid #CBE6EA; border-radius: 999px; padding: 0 10px; background: #F4FBFC">
            <${Icon} d=${IC.search} size=${14} color="#526577" /><span class="sr">ค้นหา</span>
            <input value=${q} onInput=${(e) => setQ(e.target.value)} placeholder="ค้นหา Code / เตียง" style="flex: 1; min-width: 0; border: none; background: transparent; font-size: 12px; outline: none" /></label>
        </div>
        ${shown.length === 0 && html`<div class="small muted" style="text-align: center; padding: 12px">${patients.length ? 'ไม่พบเตียงที่ค้นหา' : 'ยังไม่มีผู้ป่วย กด "รับผู้ป่วยใหม่" เพื่อเริ่ม'}</div>`}
        ${shown.map((p) => { const a = aOf(p); const s = assessStatus(a); const t = ST[s]; return html`<div class="bedrow">
          <span class="stripe" style=${{ background: t.stripe }}></span>
          <span class="bedno"><small>เตียง</small><b>${p.bed}</b></span>
          <span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">
            <b style="font-size: 13px">Code ${p.code}</b>
            <span class="row" style="gap: 4px; flex-wrap: wrap"><span class=${'pill ' + t.cls}>${t.label}</span><span class="xs muted">P1 ${partDone(a, 1)}/15 · P2 ${partDone(a, 2)}/21</span></span>
          </span>
          <a class=${'btn sm ' + (s === 'part' ? 'primary' : 'blue')} style="min-width: 94px" href=${'#' + bedLink(p, a)}>${t.act} ›</a></div>`; })}
        ${!ql && list.length > 5 && html`<button class="btn sm" onClick=${() => setAll(!all)}>${all ? 'ย่อรายการ ▲' : 'ดูทั้งหมด ' + list.length + ' เตียง ▼'}</button>`}
      </section>
      ${menuAlert('mob-only')}
      </div>
    </div>
    <${Nav} active="/" alerts=${alerts} />
  </div>`;
}
