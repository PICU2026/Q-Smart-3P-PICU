import { html, useState, useData, Icon, IC, Nurse, AppBar, Nav, Spinner, ErrorBox, Overlay, go } from '../ui.js';
import { store } from '../store.js';
import { todayISO, currentShift, SHIFTS, shiftOf, thDate } from '../dates.js';
import { assessStatus } from '../logic.js';

const LBL = { done: ['ประเมินแล้ว', 'ok'], part: ['กำลังประเมิน', 'warn'], none: ['ยังไม่ประเมิน', 'bad'] };

export function Start({ user, alerts, query }) {
  const [date, setDate] = useState(todayISO());
  const [shift, setShift] = useState(currentShift());
  const [pid, setPid] = useState(query.p || null);
  const [n, setN] = useState(null);
  const [warn, setWarn] = useState(false);
  const [modal, setModal] = useState(false);
  const [p2, setP2] = useState('');
  const [busy, setBusy] = useState(false);
  const d = useData(() => Promise.all([store.listPatients('active'), store.listAssessments(date, date), store.listProfiles()]), [date]);
  if (d.loading && !d.data) return html`<div class="phone"><${AppBar} alerts=${alerts} /><${Spinner} /></div>`;
  if (d.error) return html`<div class="phone"><${AppBar} alerts=${alerts} /><div class="content"><${ErrorBox} error=${d.error} /></div></div>`;
  const [patients, asses, profiles] = d.data;
  const aOf = (p) => asses.find((a) => a.patient_id === p.id && a.shift === shift);
  const ok = [!!date, !!shift, !!pid, !!n];
  const steps = ok.filter(Boolean).length;
  const names = ['วันที่', 'เวร', 'เตียง', 'จำนวนผู้ประเมิน'];
  const pat = patients.find((p) => p.id === pid);
  const others = profiles.filter((p) => p.name !== user.name);
  const begin = async () => {
    setBusy(true);
    try {
      const existing = await store.findAssessment(pid, date, shift);
      const mode = n === 1 ? 1 : 2;
      const a = await store.saveAssessment(Object.assign({ patient_id: pid, date, shift, results: {}, submitted: false }, existing || {}, {
        mode, part1_by: (existing && existing.part1_by) || user.name, part2_by: mode === 2 ? (p2 || (existing && existing.part2_by) || '') : null }));
      go('/assess/' + a.id);
    } catch (x) { alert(x.message); setBusy(false); }
  };
  const Step = ({ i, t }) => html`<div class="row"><span style="flex: none; width: 24px; height: 24px; border-radius: 999px; background: var(--teal); color: #fff; font-size: 12px; font-weight: 700; display: flex; align-items: center; justify-content: center">${i}</span><h2>${t}</h2>${ok[i - 1] && html`<span style="margin-left: auto; color: var(--ok); font-weight: 700">✓</span>`}</div>`;
  return html`<div class="phone">
    <${AppBar} alerts=${alerts} />
    <div class="content">
      <section class="hero" style="padding: 10px 6px 0 14px">
        <div style="flex: 1; padding-bottom: 12px"><div class="row"><${Icon} d=${IC.clip} size=${26} color="#0B6A82" /><b style="font-size: 19px; color: var(--teal-d)">เริ่มการประเมินผู้ป่วย</b></div>
          <div class="xs muted">เลือก "วันที่ – เวร – เตียง – จำนวนผู้ประเมิน" ให้ครบ 4 ขั้นตอน</div></div>
        <${Nurse} pose="tablet" w=${78} />
      </section>
      <div class="dgrid2">
      <section class="card"><${Step} i=${1} t="เลือกวันที่ประเมิน" />
        <div class="row"><label class="field" style="flex: 1"><span class="sr">วันที่</span><input class="input" type="date" value=${date} onChange=${(e) => setDate(e.target.value)} /></label>
          <button class="btn sm" style="background: var(--ok-bg); color: var(--ok); border: none; height: 42px" onClick=${() => setDate(todayISO())}>วันนี้</button></div></section>
      <section class="card"><${Step} i=${2} t="เลือกเวรประเมิน" />
        <div class="grid3">${SHIFTS.map((s) => html`<button class=${'choice' + (shift === s.k ? ' on' : '')} aria-pressed=${shift === s.k} onClick=${() => { setShift(s.k); setWarn(false); }}>
          <${Icon} d=${s.icon} size=${26} fill=${s.fill} color=${s.ink} stroke=${1.8} /><b style="font-size: 13px">${s.name}</b><span class="xs muted">${s.time}</span></button>`)}</div></section>
      <section class="card"><${Step} i=${3} t="เลือกเตียงผู้ป่วย" />
        <div class="row" style="flex-wrap: wrap; gap: 6px"><span class="pill ok">✓ ประเมินแล้ว</span><span class="pill warn">◔ กำลังประเมิน</span><span class="pill bad">! ยังไม่ประเมิน</span></div>
        ${patients.length === 0 && html`<div class="small muted">ยังไม่มีผู้ป่วย <a href="#/admit">รับผู้ป่วยใหม่</a></div>`}
        <div class="grid4" style="gap: 5px">${patients.map((p) => { const l = LBL[assessStatus(aOf(p))]; const on = pid === p.id; return html`<button class=${'choice' + (on ? ' on' : '')} style="padding: 6px 2px; border-color: ${on ? '#1F6FD1' : ''}" aria-pressed=${on} onClick=${() => { setPid(p.id); setWarn(false); }}>
          <b style="font-size: 12px">เตียง ${p.bed}</b><span class="xs muted">${p.code}</span><span class=${'pill ' + l[1]} style="font-size: 9.5px; padding: 0 6px">${l[0]}</span>
          ${on && html`<span style="position: absolute; top: -6px; right: -6px; width: 18px; height: 18px; border-radius: 999px; background: #1F6FD1; color: #fff; font-size: 11px; display: flex; align-items: center; justify-content: center">✓</span>`}</button>`; })}</div></section>
      <section class="card"><${Step} i=${4} t="เลือกจำนวนผู้ประเมิน" />
        <div class="grid4" style="gap: 5px">${[[1, 'ประเมินทั้ง 9 Goal'], [2, 'แบ่ง Part 1 และ 2']].map(([k, sub]) => html`<button class=${'choice' + (n === k ? ' on' : '')} style="grid-column: span 2" aria-pressed=${n === k} onClick=${() => { setN(k); setWarn(false); }}>
          <span style="color: var(--teal)">${Array.from({ length: k }).map(() => html`<${Icon} d=${IC.user} size=${18} />`)}</span><b style="font-size: 13px">${k} คน</b><span class="xs muted">${sub}</span></button>`)}</div></section>
      </div>
      ${warn && steps < 4 && html`<div class="alertbox bad" role="alert"><${Icon} d=${IC.warn} />ยังเลือกไม่ครบ: ${names.filter((_, i) => !ok[i]).join(', ')} — เลือกให้ครบ 4 ขั้นตอนก่อนเริ่มประเมิน</div>`}
      <button class="btn primary block" style=${{ height: '52px', maxWidth: '520px', alignSelf: 'center', background: steps === 4 ? '' : '#8FA5B3' }} onClick=${() => (steps === 4 ? setModal(true) : setWarn(true))}><${Icon} d=${IC.play} fill="currentColor" size=${16} />ยืนยันและเริ่มประเมิน (${steps}/4)</button>
    </div>
    <${Nav} active="/start" alerts=${alerts} />
    ${modal && html`<${Overlay} label="ยืนยันข้อมูลเพื่อเริ่มประเมิน" onClose=${() => setModal(false)}>
      <div class="row"><${Icon} d=${IC.clip} size=${26} color="#0B6A82" /><b style="flex: 1; font-size: 17px; color: var(--teal-d)">ยืนยันข้อมูลเพื่อเริ่มประเมิน</b></div>
      ${[['วันที่ประเมิน', thDate(date)], ['เวรที่ประเมิน', shiftOf(shift).name + ' ' + shiftOf(shift).time], ['เตียง / Code', pat ? 'เตียง ' + pat.bed + ' | ' + pat.code : '-'], ['จำนวนผู้ประเมิน', n + ' คน']].map(([k, v]) => html`<div class="row" style="justify-content: space-between; background: #F4FBFC; border-radius: 12px; padding: 8px 12px; font-size: 13px"><span class="muted">${k}</span><b>${v}</b></div>`)}
      ${n === 1 ? html`<div class="card" style="background: #EAF6F8; box-shadow: none"><b>ประเมิน 1 ท่าน: ${user.name}</b><span class="xs muted">ครบ 9 Goal ต่อเนื่อง (36 ข้อ)</span></div>` : html`<div class="grid2">
        <div class="card" style="background: #EAF6F8; box-shadow: none; padding: 10px"><b>Part 1 (G1–G4)</b><span class="xs">${user.name}</span></div>
        <label class="card field" style="background: #FFEFF4; box-shadow: none; padding: 10px"><b style="color: var(--ink)">Part 2 (G5–G9)</b>
          <select class="input" value=${p2} onChange=${(e) => setP2(e.target.value)}><option value="">ยังไม่ระบุ</option>${others.map((o) => html`<option value=${o.name}>${o.name}</option>`)}</select></label></div>`}
      <div class="xs" style="background: #EAF6F8; color: var(--teal-d); border-radius: 10px; padding: 6px 10px">ถ้าเตียงนี้เริ่มประเมินไว้แล้ว ระบบจะดึงข้อที่ทำไว้มาให้ต่อ</div>
      <div class="grid2"><button class="btn" onClick=${() => setModal(false)}>‹ ย้อนกลับ</button><button class="btn primary" disabled=${busy} onClick=${begin}>▶ เริ่มประเมินเลย</button></div>
    </${Overlay}>`}
  </div>`;
}
