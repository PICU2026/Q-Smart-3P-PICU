import { html, useState, useData, Icon, IC, Nurse, AppBar, Nav, Spinner, ErrorBox, Overlay, toast, go } from '../ui.js';
import { store } from '../store.js';
import { DEV_TYPES } from '../goals.js';
import { todayISO, addDaysISO, thShort, thDate } from '../dates.js';

const REASONS = ['ย้ายไปหอผู้ป่วยอื่น', 'ส่งต่อ (Refer)', 'จำหน่ายกลับบ้าน', 'อื่น ๆ'];
const BEDS = Array.from({ length: 14 }, (_, i) => String(i + 1).padStart(2, '0'));

export function Patients({ alerts }) {
  const [tab, setTab] = useState('active'); const [q, setQ] = useState('');
  const [sheet, setSheet] = useState(null); const [view, setView] = useState('menu'); const [form, setForm] = useState({});
  const d = useData(() => store.listPatients(), []);
  if (d.loading && !d.data) return html`<div class="phone"><${AppBar} back="/" alerts=${alerts} /><${Spinner} /></div>`;
  if (d.error) return html`<div class="phone"><${AppBar} back="/" alerts=${alerts} /><div class="content"><${ErrorBox} error=${d.error} /></div></div>`;
  const all = d.data; const active = all.filter((p) => p.status === 'active'); const gone = all.filter((p) => p.status !== 'active');
  const used = active.map((p) => p.bed);
  const free = BEDS.filter((b) => !used.includes(b));
  const ql = q.trim().toLowerCase();
  const list = (tab === 'active' ? active : gone).filter((p) => !ql || p.code.toLowerCase().includes(ql) || p.bed.includes(ql));
  const set = (k, v) => setForm(Object.assign({}, form, { [k]: v }));
  const finish = (msg) => { setSheet(null); d.reload(); toast(msg); };
  const saveEdit = async () => {
    const p = sheet;
    if (form.bed !== p.bed && used.includes(form.bed)) { toast('เตียง ' + form.bed + ' มีผู้ป่วยอยู่แล้ว'); return; }
    try { await store.updatePatient(p.id, { code: form.code.trim() || p.code, bed: form.bed }); finish('แก้ไขข้อมูลสำเร็จ ' + (form.code || p.code) + ' · เตียง ' + form.bed); }
    catch (x) { toast('บันทึกไม่สำเร็จ: ' + x.message); }
  };
  const discharge = async () => {
    try { await store.updatePatient(sheet.id, { status: 'discharged', discharged_at: form.date + 'T' + form.time + ':00', discharge_reason: form.reason === 'อื่น ๆ' && form.other ? form.other : form.reason });
      finish('ย้ายออกสำเร็จ ' + sheet.code + ' | เตียง ' + sheet.bed); } catch (x) { toast('บันทึกไม่สำเร็จ: ' + x.message); }
  };
  const readmit = async () => {
    if (!form.bed) { toast('กรุณาเลือกเตียง'); return; }
    try { await store.updatePatient(sheet.id, { status: 'active', bed: form.bed, admitted_at: form.date + 'T' + form.time + ':00', discharged_at: null, discharge_reason: null });
      setTab('active'); finish('รับกลับสำเร็จ ' + sheet.code + ' เข้าเตียง ' + form.bed + ' · กรุณาตรวจข้อมูลอุปกรณ์ใหม่'); } catch (x) { toast('บันทึกไม่สำเร็จ: ' + x.message); }
  };
  const openP = (p) => { setView('menu'); setForm({ code: p.code, bed: p.status === 'active' ? p.bed : free[0] || '', reason: REASONS[0], other: '', date: todayISO(), time: '14:00' }); setSheet(p); };
  return html`<div class="phone">
    <${AppBar} back="/" alerts=${alerts} sub="จัดการผู้ป่วย · เพิ่ม / แก้ไข / ย้ายออก / รับกลับ" />
    <div class="content">
      <section class="hero"><${Nurse} pose="tablet" w=${76} />
        <div style="flex: 1; padding-bottom: 14px"><b style="font-size: 18px; color: var(--teal-d)">จัดการผู้ป่วย</b><div class="xs muted">รับใหม่ / เปลี่ยนเตียง / ย้ายออก / รับกลับเข้า PICU</div></div></section>
      <div class="grid2" role="tablist">${[['active', 'กำลังรักษา (' + active.length + ')'], ['gone', 'ย้ายออกแล้ว (' + gone.length + ')']].map(([k, l]) => html`<button role="tab" aria-selected=${tab === k}
        class=${'choice' + (tab === k ? ' on' : '')} style="flex-direction: row; justify-content: center; min-height: 44px; font-weight: 600" onClick=${() => { setTab(k); setQ(''); }}>${l}</button>`)}</div>
      <label class="row" style="height: 42px; border: 1.5px solid #CBE6EA; border-radius: 999px; padding: 0 14px; background: #fff"><${Icon} d=${IC.search} size=${16} color="#526577" /><span class="sr">ค้นหา</span>
        <input value=${q} onInput=${(e) => setQ(e.target.value)} placeholder="ค้นหา Code / เตียง" style="flex: 1; min-width: 0; border: none; background: transparent; font-size: 13px; outline: none" /></label>
      <a class="btn green" style="align-self: flex-start; min-width: 260px" href="#/admit"><${Icon} d=${IC.plus} />เพิ่มผู้ป่วย (รับใหม่)</a>
      ${list.length === 0 && html`<div class="small muted" style="text-align: center; padding: 14px">ไม่มีรายการ</div>`}
      <div class="dlist">${list.map((p) => html`<button class="card" style="flex-direction: row; align-items: center; text-align: left" onClick=${() => openP(p)}>
        <span class="tile info" style="width: 44px; height: 44px; flex-direction: column"><span style="font-size: 9.5px">เตียง</span><b style="font-size: 16px; line-height: 1">${p.bed}</b></span>
        <span style="flex: 1; min-width: 0"><b>${p.code}</b> <span class=${'pill ' + (p.status === 'active' ? 'ok' : 'idle')}>${p.status === 'active' ? 'กำลังรักษา' : 'ย้ายออก'}</span><br />
          <span class="xs muted">${p.status === 'active' ? 'รับเข้า ' + thShort(p.admitted_at) : 'ย้ายออก ' + thShort(p.discharged_at) + ' · ' + (p.discharge_reason || '')}</span></span><${Icon} d=${IC.next} size=${16} /></button>`)}</div>
    </div>
    <${Nav} active="/" alerts=${alerts} />
    ${sheet && sheet.status === 'active' && html`<${Overlay} bottom label="จัดการผู้ป่วย" onClose=${() => setSheet(null)}>
      <b style="font-size: 17px">เตียง ${sheet.bed} · ${sheet.code} <span class="pill ok">กำลังรักษา</span></b>
      ${view === 'menu' && html`
        <button class="card" style="flex-direction: row; align-items: center; border: 1.5px solid var(--line); box-shadow: none; text-align: left" onClick=${() => setView('edit')}><span class="tile warn"><${Icon} d=${IC.pen} /></span><span><b class="small">แก้ไขข้อมูล / เปลี่ยนเตียง</b><br /><span class="xs muted">แก้ Code หรือย้ายเตียงในหอ</span></span></button>
        <a class="card" style="flex-direction: row; align-items: center; border: 1.5px solid var(--line); box-shadow: none; text-decoration: none; color: var(--ink)" href=${'#/devices?p=' + sheet.id}><span class="tile info"><${Icon} d=${IC.steth} /></span><span><b class="small">ดูอุปกรณ์ของผู้ป่วย</b><br /><span class="xs muted">วันเริ่ม / วันหมดอายุ</span></span></a>
        <button class="card" style="flex-direction: row; align-items: center; border: 1.5px solid #F7AFBB; background: #FFF7F8; box-shadow: none; text-align: left" onClick=${() => setView('out')}><span class="tile bad"><${Icon} d=${IC.logout} /></span><span><b class="small" style="color: var(--bad)">ย้ายออกจาก PICU</b><br /><span class="xs muted">ย้ายหอ / ส่งต่อ / จำหน่าย</span></span></button>`}
      ${view === 'edit' && html`<label class="field">Code ผู้ป่วย<input class="input" value=${form.code} onInput=${(e) => set('code', e.target.value)} /></label>
        <label class="field">เตียง<select class="input" value=${form.bed} onChange=${(e) => set('bed', e.target.value)}>${[sheet.bed].concat(free).map((b) => html`<option value=${b}>เตียง ${b}${b === sheet.bed ? ' (ปัจจุบัน)' : ''}</option>`)}</select></label>
        <div class="grid2"><button class="btn" onClick=${() => setView('menu')}>ย้อนกลับ</button><button class="btn primary" onClick=${saveEdit}>บันทึก</button></div>`}
      ${view === 'out' && html`<b class="small">เหตุผลการย้ายออก</b>
        ${REASONS.map((r) => html`<label class=${'choice' + (form.reason === r ? ' on' : '')} style="flex-direction: row; justify-content: flex-start; gap: 10px; padding: 8px 10px"><input type="radio" name="reason" checked=${form.reason === r} onChange=${() => set('reason', r)} style="width: 18px; height: 18px; accent-color: #D92D4A" />${r}</label>`)}
        ${form.reason === 'อื่น ๆ' && html`<input class="input" placeholder="ระบุเหตุผล" value=${form.other} onInput=${(e) => set('other', e.target.value)} />`}
        <div class="grid2"><label class="field">วันที่<input class="input" type="date" value=${form.date} onChange=${(e) => set('date', e.target.value)} /></label><label class="field">เวลา<input class="input" type="time" value=${form.time} onChange=${(e) => set('time', e.target.value)} /></label></div>
        <div class="grid2"><button class="btn" onClick=${() => setView('menu')}>ย้อนกลับ</button><button class="btn danger" onClick=${discharge}>ยืนยันย้ายออก</button></div>`}
    </${Overlay}>`}
    ${sheet && sheet.status !== 'active' && html`<${Overlay} bottom label="รับกลับเข้า PICU" onClose=${() => setSheet(null)}>
      <b style="font-size: 17px">${sheet.code} <span class="pill idle">ย้ายออกแล้ว</span></b>
      <div class="xs muted">เตียงเดิม ${sheet.bed} · ย้ายออก ${thDate(sheet.discharged_at)} · ${sheet.discharge_reason || ''}</div>
      <label class="field">เตียงใหม่ *<select class="input" value=${form.bed} onChange=${(e) => set('bed', e.target.value)}>${free.map((b) => html`<option value=${b}>เตียง ${b}</option>`)}</select></label>
      <div class="grid2"><label class="field">วันที่รับกลับ<input class="input" type="date" value=${form.date} onChange=${(e) => set('date', e.target.value)} /></label><label class="field">เวลา<input class="input" type="time" value=${form.time} onChange=${(e) => set('time', e.target.value)} /></label></div>
      <div class="xs warn" style="border-radius: 12px; padding: 8px 10px">จะเริ่มรอบการประเมินใหม่ กรุณาตรวจ/แก้ไขข้อมูลอุปกรณ์อีกครั้ง</div>
      <div class="grid2"><button class="btn" onClick=${() => setSheet(null)}>ยกเลิก</button><button class="btn green" onClick=${readmit}>ยืนยันรับกลับ</button></div>
    </${Overlay}>`}
  </div>`;
}

// ---------------- Admit (new patient, baseline recorded once) ----------------
const ADMIT_DEVS = ['circuit', 'filter', 'filter950', 'heater', 'suction', 'ng', 'fc', 'aline', 'cline', 'cvp', 'iap'];
export function Admit({ user, alerts }) {
  const pts = useData(() => store.listPatients('active'), []);
  const [f, setF] = useState({ code: '', bed: '', date: todayISO(), band1: '', band2: '', allergy: 'หัวเตียง', airway: 'ETT', ettNo: '', ettCm: '', blow: '', cuff: '', cxr: '', fall: 'ต่ำ' });
  const [dv, setDv] = useState({});
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  if (pts.loading && !pts.data) return html`<div class="phone"><${AppBar} back="/patients" alerts=${alerts} /><${Spinner} /></div>`;
  const used = (pts.data || []).map((p) => p.bed); const free = BEDS.filter((b) => !used.includes(b));
  const bed = f.bed || free[0] || '';
  const set = (k, v) => setF(Object.assign({}, f, { [k]: v }));
  const setD = (k, patch) => setDv(Object.assign({}, dv, { [k]: Object.assign({ on: false, v: todayISO(), none: false }, dv[k] || {}, patch) }));
  const save = async () => {
    setErr('');
    if (!f.code.trim()) { setErr('กรุณาใส่รหัสผู้ป่วย (Code)'); return; }
    if (!bed) { setErr('ไม่มีเตียงว่าง'); return; }
    setBusy(true);
    try {
      const devices = ADMIT_DEVS.filter((k) => dv[k] && dv[k].on).map((k) => { const t = DEV_TYPES[k]; const x = dv[k];
        if (t.life === -1) return { type: k, start_date: f.date, exp_date: x.none ? null : x.v || null, no_exp: !!x.none };
        return { type: k, start_date: x.v || f.date, exp_date: x.none || t.life <= 0 ? null : addDaysISO(x.v || f.date, t.life), no_exp: !!x.none }; });
      const tube = f.airway === 'ETT' || f.airway === 'TT';
      const baseline = { band1: f.band1, band2: f.band2, allergy: f.allergy, airway: f.airway, fall: f.fall, ettNo: tube ? f.ettNo : '', ettCm: tube ? f.ettCm : '', blow: tube ? f.blow : '', cuff: tube ? f.cuff : '', cxr: tube ? f.cxr : '', _meta: {} };
      await store.addPatient({ code: f.code.trim(), bed, admitted_at: f.date + 'T' + new Date().toTimeString().slice(0, 8), baseline }, devices, user.name);
      toast('เพิ่มผู้ป่วย ' + f.code + ' เตียง ' + bed + ' แล้ว'); go('/patients');
    } catch (x) { setErr(x.message); setBusy(false); }
  };
  const inp = (k, label, unit) => html`<label class="field">${label}${unit ? ' (' + unit + ')' : ''}<input class="input" value=${f[k]} onInput=${(e) => set(k, e.target.value)} /></label>`;
  return html`<div class="phone">
    <${AppBar} back="/patients" alerts=${alerts} title="เพิ่มผู้ป่วย" sub="รับผู้ป่วยใหม่ · บันทึกข้อมูลตั้งต้นครั้งเดียว" />
    <div class="content">
      <div class="card" style="flex-direction: row; align-items: center"><span class="tile warn"><${Icon} d=${IC.lock} /></span>
        <span class="small">ข้อมูลหน้านี้จะ <b style="color: var(--teal-d)">ล็อกไว้ให้ทุกเวร</b> เวรถัดไปไม่ต้องกรอกซ้ำ แก้ได้เมื่อเปลี่ยนท่อหรืออุปกรณ์ วัน Exp คำนวณให้อัตโนมัติ</span></div>
      <div class="dgrid2">
      <section class="card"><h2>ข้อมูลผู้ป่วย</h2><div class="grid2">
        ${inp('code', 'รหัสผู้ป่วย (Code) *')}
        <label class="field">เตียง *<select class="input" value=${bed} onChange=${(e) => set('bed', e.target.value)}>${free.map((b) => html`<option value=${b}>เตียง ${b}</option>`)}</select></label>
        <label class="field" style="grid-column: 1 / -1">วันที่รับ<input class="input" type="date" value=${f.date} onChange=${(e) => set('date', e.target.value)} /></label></div>
        <div class="xs muted">ช่วงทดลอง: ใช้รหัส (เช่น P012) ไม่ต้องใส่ชื่อหรือ HN</div></section>
      <section class="card"><h2>Goal 1 · ระบุตัวผู้ป่วย</h2><div class="grid2">${inp('band1', 'Pt. Band ตำแหน่ง 1')}${inp('band2', 'Pt. Band ตำแหน่ง 2')}</div>${inp('allergy', 'ป้ายแพ้ยา / G6PD ติดที่')}</section>
      <section class="card"><h2>Goal 8 · ทางเดินหายใจ</h2>
        <div class="row" style="flex-wrap: wrap; gap: 6px">${['ETT', 'TT', 'NIV', 'HHHFNC', 'ไม่มี'].map((x) => html`<button class=${'chip' + (f.airway === x ? ' on' : '')} aria-pressed=${f.airway === x} onClick=${() => set('airway', x)}>${x}</button>`)}</div>
        ${(f.airway === 'ETT' || f.airway === 'TT') && html`<div class="grid2">${inp('ettNo', 'เบอร์ท่อ (No.)', '#')}${inp('ettCm', 'ตำแหน่ง', 'cm')}${inp('blow', 'Blow', 'ml')}${inp('cuff', 'Cuff pressure', 'cmH2O')}</div>${inp('cxr', 'CXR : ETT เหนือ Carina', 'cm')}`}</section>
      </div><div class="dgrid2"><section class="card"><h2>Goal 5 · อุปกรณ์ที่ใส่ และวันที่เริ่ม</h2><div class="xs muted">เลือกเฉพาะที่ผู้ป่วยมี ระบบคำนวณวัน Exp ให้</div>
        ${ADMIT_DEVS.map((k) => { const t = DEV_TYPES[k]; const x = Object.assign({ on: false, v: todayISO(), none: false }, dv[k] || {});
          const out = x.none ? 'ไม่มีวัน Exp' : t.life > 0 ? 'Exp ' + thShort(addDaysISO(x.v, t.life)) : t.life === 0 ? 'Start ' + thShort(x.v) : x.v ? 'Exp ' + thShort(x.v) : '-';
          return html`<div class=${'choice' + (x.on ? ' on' : '')} style="align-items: stretch; padding: 8px 10px; gap: 6px">
            <label class="row" style="min-height: 32px"><input type="checkbox" checked=${x.on} onChange=${(e) => setD(k, { on: e.target.checked })} style="width: 22px; height: 22px; accent-color: #0B6A82" />
              <span style="flex: 1"><b class="small">${t.name}</b><br /><span class="xs muted">${t.life > 0 ? 'อายุ ' + t.life + ' วัน' : t.life === 0 ? 'บันทึกวันที่เริ่ม' : 'ใส่วัน Exp เอง'}</span></span>${x.on && html`<span class="pill info">${out}</span>`}</label>
            ${x.on && html`<div class="grid2" style="align-items: end"><label class="field">${t.life === -1 ? 'วัน Exp' : 'วันที่เริ่ม'}<input class="input" type="date" disabled=${x.none} value=${x.v} onChange=${(e) => setD(k, { v: e.target.value })} style="background: #fff" /></label>
              <label class="row xs" style="gap: 6px; min-height: 42px; color: var(--ink)"><input type="checkbox" checked=${x.none} onChange=${(e) => setD(k, { none: e.target.checked })} style="width: 18px; height: 18px; accent-color: #0B6A82" />ไม่มีวัน Exp</label></div>`}
          </div>`; })}</section>
      <section class="card"><h2>Goal 9 · ระดับความเสี่ยงพลัดตก</h2>
        <div class="grid3">${[['ต่ำ', '< 12', 'ok'], ['ปานกลาง', '12–16 ป้ายเหลือง', 'warn'], ['สูง', '≥ 17 ป้ายแดง', 'bad']].map(([l, s, c]) => html`<button class=${'choice' + (f.fall === l ? ' on ' + c : '')} aria-pressed=${f.fall === l} onClick=${() => set('fall', l)}><b class="small">${l}</b><span class="xs">${s}</span></button>`)}</div></section>
      </div>
      ${err && html`<div class="alertbox bad" role="alert"><${Icon} d=${IC.warn} />${err}</div>`}
      <button class="btn primary block" style="height: 52px; max-width: 520px; align-self: center" disabled=${busy} onClick=${save}><${Icon} d=${IC.lock} />${busy ? 'กำลังบันทึก…' : 'บันทึกข้อมูลตั้งต้น (ล็อกให้ทุกเวร)'}</button>
    </div>
  </div>`;
}
