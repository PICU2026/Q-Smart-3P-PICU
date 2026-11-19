import { html, useState, useEffect, Icon, IC, Nurse, Bed, AppBar, Nav, Spinner, ErrorBox, Overlay, toast, go } from '../ui.js';
import { store } from '../store.js';
import { GOALS, I, T, PART_OF, PART_RANGE, ALL_ITEMS, TOTAL, DEV_TYPES } from '../goals.js';
import { shiftOf, thDate, todayISO } from '../dates.js';
import { answered, devStatus, DST, dueText } from '../logic.js';

const matchDev = (k, d) => !d.removed_at && (d.type === k || (k === 'filter' && d.type === 'filter950'));

export function Assess({ user, alerts, params }) {
  const [st, setSt] = useState(null);
  const [err, setErr] = useState(null);
  const [part, setPart] = useState(2);
  const [open, setOpen] = useState({});
  const [onlyPending, setOnlyPending] = useState(true);
  const [editing, setEditing] = useState(null); // item id
  const [draft, setDraft] = useState({});
  const [warn, setWarn] = useState(false);
  const [touched, setTouched] = useState({}); // items answered on this screen stay visible

  const load = async () => {
    try {
      const a = await store.getAssessment(params.id); if (!a) throw new Error('ไม่พบแบบประเมินนี้');
      const [p, devs] = await Promise.all([store.getPatient(a.patient_id), store.listDevices(a.patient_id)]);
      setSt({ a, p, devs });
      return a;
    } catch (x) { setErr(x); }
  };
  useEffect(() => { load().then((a) => {
    if (!a) return;
    // jump to first unanswered goal and part
    const first = ALL_ITEMS.find((it) => !(a.results[it.id] && a.results[it.id].s));
    if (first) { setOpen({ [first.gi]: true }); setPart(PART_OF[first.gi]); } else { setOpen({ 0: true }); setOnlyPending(false); }
  }); }, [params.id]);

  if (err) return html`<div class="phone"><${AppBar} back="/" alerts=${alerts} /><div class="content"><${ErrorBox} error=${err} /></div></div>`;
  if (!st) return html`<div class="phone"><${AppBar} back="/" alerts=${alerts} /><${Spinner} /></div>`;
  const { a, p, devs } = st;
  const mode = a.mode || 1;

  const persist = async (patch) => {
    const na = Object.assign({}, a, patch);
    setSt(Object.assign({}, st, { a: na }));
    try { const saved = await store.saveAssessment(na); setSt((s) => Object.assign({}, s, { a: Object.assign({}, s.a, { id: saved.id }) })); }
    catch (x) { toast('บันทึกไม่สำเร็จ: ' + x.message); }
  };
  const setResult = (id, patch) => {
    const r = Object.assign({}, a.results); const cur = Object.assign({}, r[id] || {}, patch, { by: user.name, at: new Date().toISOString() });
    r[id] = cur; setTouched((t) => Object.assign({}, t, { [id]: true })); persist({ results: r, submitted: false });
  };
  const toggleS = (id, s) => { const cur = a.results[id] && a.results[id].s; setResult(id, { s: cur === s ? null : s }); };

  const scope = GOALS.map((g, gi) => gi).filter((gi) => mode === 1 || PART_OF[gi] === part);
  let next = null;
  scope.forEach((gi) => GOALS[gi].items.forEach((it, ii) => { if (!next && !(a.results[it.id] && a.results[it.id].s)) next = { gi, ii, it }; }));
  const nDone = answered(a);
  const goalsDone = GOALS.filter((g) => g.items.every((it) => a.results[it.id] && a.results[it.id].s)).length;
  const pinfo = (pp) => { const its = ALL_ITEMS.filter((it) => PART_OF[it.gi] === pp); const dn = its.filter((it) => a.results[it.id] && a.results[it.id].s).length; return { dn, tot: its.length }; };

  // ----- fixed (carried-over) data -----
  const fixedRows = (it) => it.fix.map((f) => {
    if (f.kind === 'text') { const v = (p.baseline || {})[f.k]; return { label: f.label, value: v ? v + (f.unit ? ' ' + f.unit : '') : '– ยังไม่ระบุ' }; }
    const dv = devs.find((d) => matchDev(f.k, d));
    if (!dv) return { label: f.label, value: '– ไม่ได้ใช้' };
    const s = devStatus(dv); return { label: f.label, value: dueText(dv), pill: s === 'ok' ? null : DST[s] };
  });
  const fixedSrc = (it) => {
    const m = ((p.baseline || {})._meta || {})[it.id];
    if (m) return '✎ เปลี่ยนโดย ' + m.by + ' · ' + m.when;
    return 'ข้อมูลตั้งต้นจากการรับผู้ป่วย / หน้าอุปกรณ์';
  };
  const startEdit = (it) => {
    const dr = {};
    it.fix.forEach((f) => {
      if (f.kind === 'text') dr[f.k] = (p.baseline || {})[f.k] || '';
      else { const dv = devs.find((d) => matchDev(f.k, d)); const manual = DEV_TYPES[f.k === 'filter' ? 'filter' : f.k].life === -1;
        dr[f.k] = { v: dv ? (manual ? (dv.exp_date || '') : dv.start_date) : '', none: dv ? !!dv.no_exp : false, manual }; }
    });
    setDraft(dr); setEditing(it.id);
  };
  const saveEdit = async (it) => {
    const when = thDate(todayISO()) + ' (' + shiftOf(a.shift).short + ')';
    try {
      const bl = Object.assign({}, p.baseline || {}); bl._meta = Object.assign({}, bl._meta || {});
      let textChanged = false;
      for (const f of it.fix) {
        if (f.kind === 'text') { if ((bl[f.k] || '') !== draft[f.k]) { bl[f.k] = draft[f.k]; textChanged = true; } continue; }
        const dr = draft[f.k]; const dv = devs.find((d) => matchDev(f.k, d)); const t = DEV_TYPES[f.k];
        if (!dv && !dr.v && !dr.none) continue;
        const patch = dr.manual ? { exp_date: dr.none ? null : dr.v || null, no_exp: dr.none } : { start_date: dr.v || todayISO(), exp_date: null, no_exp: dr.none };
        if (dv) {
          const same = dr.manual ? (dv.exp_date || '') === (dr.v || '') && !!dv.no_exp === dr.none : dv.start_date === dr.v && !!dv.no_exp === dr.none;
          if (!same) await store.updateDevice(dv.id, patch, 'change', dr.none ? 'ตั้งเป็นไม่มีวัน Exp' : dr.manual ? 'เปลี่ยนวันหมดอายุ' : 'เปลี่ยนอุปกรณ์ใหม่ (เริ่ม ' + thDate(patch.start_date) + ')', user.name);
        } else {
          await store.addDevice(p.id, Object.assign({ type: f.k, start_date: dr.manual ? todayISO() : patch.start_date }, patch), user.name, 'เพิ่มจากแบบประเมิน');
        }
        void t;
      }
      bl._meta[it.id] = { by: user.name, when };
      const np = await store.updatePatient(p.id, { baseline: bl });
      const nd = await store.listDevices(p.id);
      setSt(Object.assign({}, st, { p: np, devs: nd })); setEditing(null); toast('บันทึกการเปลี่ยนแปลงแล้ว');
      void textChanged;
    } catch (x) { toast('บันทึกไม่สำเร็จ: ' + x.message); }
  };

  const submit = () => {
    if (nDone < TOTAL) { setWarn(true); return; }
    persist({ submitted: true }).then(() => go('/result/' + a.id));
  };
  const goPending = () => { const o = {}; GOALS.forEach((g, i) => { if (g.items.some((it) => !(a.results[it.id] && a.results[it.id].s))) o[i] = true; }); setOpen(o); setOnlyPending(true); setWarn(false);
    if (mode === 2) { const f = ALL_ITEMS.find((it) => !(a.results[it.id] && a.results[it.id].s)); if (f) setPart(PART_OF[f.gi]); } scrollTo(0, 0); };

  // plain render function (not a component) so inputs keep focus while typing
  const renderItem = (it, ii) => {
    const r = a.results[it.id] || {}; const s = r.s; const tone = T[it.c]; const isNext = next && next.it.id === it.id;
    return html`<article class=${'item' + (isNext ? ' next' : '')} style=${{ background: s === 'f' ? '#FFF7F8' : s ? '#F7FCF9' : '#fff' }}>
      <div class="row" style="align-items: flex-start">
        <span class="tile" style=${{ background: tone[0], color: tone[1], width: '34px', height: '34px' }}><${Icon} d=${I[it.i]} size=${19} stroke=${1.9} /></span>
        <div style="flex: 1; min-width: 0"><div style="font-size: 13px; font-weight: 600; line-height: 1.45"><span class="muted">${ii + 1}.</span> ${it.t}</div>
          ${it.d && html`<div class="xs muted" style="white-space: pre-line; line-height: 1.5">${it.d}</div>`}</div>
        ${isNext && html`<span class="pill pulse" style="background: var(--blue); color: #fff">ข้อถัดไป</span>`}
      </div>
      ${it.chips && html`<div class="row" style="flex-wrap: wrap; gap: 6px">${it.chips.map((c) => { const on = (r.chips || []).includes(c); return html`<button class=${'chip' + (on ? ' on' : '')} aria-pressed=${on}
        onClick=${() => setResult(it.id, { chips: on ? (r.chips || []).filter((x) => x !== c) : (r.chips || []).concat([c]) })}>${on ? '✓ ' : ''}${c}</button>`; })}</div>`}
      ${it.fix && editing !== it.id && html`<div class="fixed">
        ${fixedRows(it).map((row) => html`<div class="row" style="gap: 6px"><span style="flex: 1; color: #6B4A00">${row.label}</span><b>${row.value}</b>${row.pill && html`<span class=${'pill ' + row.pill[1]}>${row.pill[0]}</span>`}</div>`)}
        <div class="row" style="justify-content: space-between; border-top: 1px dashed #EBCB7A; padding-top: 6px"><span class="xs" style="color: #6B4A00">${fixedSrc(it)}</span>
          <button class="btn sm" style="border-color: #D9AE3A; color: #6B4A00" onClick=${() => startEdit(it)}>✎ เปลี่ยน</button></div></div>`}
      ${it.fix && editing === it.id && html`<div class="editbox">
        <b class="small" style="color: var(--teal-d)">แก้ไขข้อมูล (เปลี่ยนท่อ / อุปกรณ์ใหม่)</b>
        ${it.fix.map((f) => f.kind === 'text'
          ? html`<label class="field">${f.label}${f.unit ? ' (' + f.unit + ')' : ''}<input class="input" value=${draft[f.k]} onInput=${(e) => setDraft(Object.assign({}, draft, { [f.k]: e.target.value }))} /></label>`
          : html`<div class="field"><label class="field">${f.label} ${draft[f.k].manual ? '(วันหมดอายุ)' : '(วันเริ่มใช้)'}
              <input class="input" type="date" disabled=${draft[f.k].none} value=${draft[f.k].v} onChange=${(e) => setDraft(Object.assign({}, draft, { [f.k]: Object.assign({}, draft[f.k], { v: e.target.value }) }))} /></label>
              <label class="row xs" style="gap: 6px; min-height: 30px; color: var(--ink)"><input type="checkbox" checked=${draft[f.k].none} onChange=${(e) => setDraft(Object.assign({}, draft, { [f.k]: Object.assign({}, draft[f.k], { none: e.target.checked }) }))} style="width: 18px; height: 18px; accent-color: #0B6A82" />ไม่มีวัน Exp (เช่น ศัลยกรรมใส่ให้)</label></div>`)}
        <div class="grid2"><button class="btn sm" onClick=${() => setEditing(null)}>ยกเลิก</button><button class="btn sm primary" onClick=${() => saveEdit(it)}>บันทึกการเปลี่ยน</button></div></div>`}
      <div class="pfn" role="group" aria-label="ผลการตรวจ">
        <button class=${s === 'p' ? 'p' : ''} aria-pressed=${s === 'p'} onClick=${() => toggleS(it.id, 'p')}>✓ ผ่าน</button>
        <button class=${s === 'f' ? 'f' : ''} aria-pressed=${s === 'f'} onClick=${() => toggleS(it.id, 'f')}>✕ ไม่ผ่าน</button>
        <button class=${s === 'n' ? 'n' : ''} aria-pressed=${s === 'n'} onClick=${() => toggleS(it.id, 'n')}>– N/A</button></div>
      ${s === 'f' && html`<label class="field" style="color: var(--bad); font-weight: 600">ระบุปัญหา / การแก้ไข
        <textarea class="input" rows="2" placeholder="เช่น เปลี่ยนแล้ว, แจ้งหัวหน้าเวร" style="background: #FFF7F8; border-color: #F7AFBB" onChange=${(e) => setResult(it.id, { note: e.target.value })}>${r.note || ''}</textarea></label>`}
    </article>`;
  };

  return html`<div class="phone">
    <${AppBar} back="/" alerts=${alerts} />
    <div class="content split">
      <div class="side">
      <section class="hero"><${Nurse} pose="tablet" w=${72} />
        <div style="flex: 1; padding-bottom: 12px; text-align: center"><div class="bubble pop" style="display: inline-block; border-radius: 18px"><b style="font-size: 17px; color: var(--teal-d)">แบบประเมิน</b><div class="small" style="font-weight: 600; color: var(--teal)">(${mode === 1 ? 'ประเมิน 1 ท่าน' : 'ประเมิน 2 ท่าน'})</div></div></div>
        <div style="align-self: center"><${Bed} w=${76} /></div></section>
      <div class="seg" style="grid-template-columns: 1fr 1fr" role="group" aria-label="รูปแบบการประเมิน">
        <button class=${mode === 1 ? 'on' : ''} aria-pressed=${mode === 1} onClick=${() => persist({ mode: 1 })}>ประเมิน 1 ท่าน (9 Goal)</button>
        <button class=${mode === 2 ? 'on' : ''} aria-pressed=${mode === 2} onClick=${() => persist({ mode: 2 })}>ประเมิน 2 ท่าน (2 Part)</button></div>
      <section class="card small" style="flex-direction: row; flex-wrap: wrap; gap: 4px 12px; align-items: center">
        <span>${thDate(a.date)}</span><span class="pill warn">${shiftOf(a.shift).name}</span><b>เตียง ${p.bed} · Code ${p.code}</b>
        <span class="xs muted" style="width: 100%">ผู้ประเมิน: ${mode === 1 ? (a.part1_by || user.name) : (a.part1_by || '-') + ' (Part 1), ' + (a.part2_by || 'ยังไม่ระบุ') + ' (Part 2)'}</span></section>
      ${mode === 1 ? html`<section class="card" style="flex-direction: row; align-items: center; background: linear-gradient(115deg, #EAF8EE, #fff); border: 1.5px solid #A9DDBC">
          <${Icon} d=${IC.clip} size=${32} color="#17663A" /><div style="flex: 1"><div class="xs muted">ความคืบหน้ารวม</div><b style="font-size: 19px; color: var(--teal-d)">${goalsDone} / 9 Goal</b> <span class="xs muted">· ${nDone}/${TOTAL} ข้อ</span></div>
          <span class=${'pill ' + (nDone === TOTAL ? 'ok' : 'warn')}>${nDone === TOTAL ? '✓ ประเมินครบแล้ว' : 'ค้าง ' + (TOTAL - nDone) + ' ข้อ'}</span></section>`
      : html`<div class="grid2">${[1, 2].map((pp) => { const pi = pinfo(pp); const full = pi.dn === pi.tot; const on = part === pp; return html`<button class=${'choice' + (on ? ' on' : '')} style="align-items: stretch; text-align: left; padding: 10px; gap: 4px" aria-pressed=${on} onClick=${() => setPart(pp)}>
          <span class="row" style="justify-content: space-between"><b>Part ${pp}</b><span class="xs muted">${PART_RANGE[pp]}</span></span>
          <span class="xs">${pp === 1 ? a.part1_by || '-' : a.part2_by || 'ยังไม่ระบุ'}</span>
          <b style=${{ fontSize: '17px', color: full ? '#17663A' : '#A35410' }}>${pi.dn}/${pi.tot} ข้อ</b>
          <span class="bar"><span style=${{ width: Math.round(pi.dn / pi.tot * 100) + '%', background: full ? '#17663A' : '#E88A1A' }}></span></span>
          <span class=${'pill ' + (full ? 'ok' : 'warn')} style="align-self: flex-start">${full ? '✓ ครบถ้วน' : 'ค้าง ' + (pi.tot - pi.dn) + ' ข้อ'}</span></button>`; })}</div>`}
      <label class="card row" style="flex-direction: row; justify-content: space-between; padding: 8px 12px"><span class="small">แสดงเฉพาะข้อที่ยังไม่ประเมิน</span>
        <input type="checkbox" checked=${onlyPending} onChange=${(e) => setOnlyPending(e.target.checked)} style="width: 22px; height: 22px; accent-color: #0B6A82" /></label>
      ${next && html`<div class="alertbox" style="background: #E2EEFF; color: #1A4E99; border: 1.5px solid #AFCBF2; font-weight: 500"><${Icon} d=${IC.pin} fill="#1F6FD1" color="#1F6FD1" stroke=${0} size=${22} />
        <span><b>ระบบพามาที่ข้อแรกที่ยังไม่ได้ประเมิน</b><br />G${next.gi + 1} ข้อ ${next.ii + 1} · ${next.it.t}</span></div>`}
      </div>
      <div class="main">
      ${scope.map((gi) => { const g = GOALS[gi]; const dn = g.items.filter((it) => a.results[it.id] && a.results[it.id].s).length; const full = dn === g.items.length;
        const visible = g.items.map((it, ii) => ({ it, ii })).filter(({ it }) => !onlyPending || touched[it.id] || !(a.results[it.id] && a.results[it.id].s)); const isOpen = !!open[gi];
        return html`<section class="goal" style=${{ borderColor: next && next.gi === gi ? '#AFCBF2' : '#fff' }}>
          <button class="head" aria-expanded=${isOpen} onClick=${() => setOpen(Object.assign({}, open, { [gi]: !isOpen }))}>
            <span class="gnum">G${gi + 1}</span><span class="tile" style=${{ background: T[g.tone][0], color: T[g.tone][1], width: '32px', height: '32px' }}><${Icon} d=${g.icon} size=${18} /></span>
            <span style="flex: 1; min-width: 0"><b style="display: block; font-size: 13.5px">${g.title}</b><span class="xs muted">${dn}/${g.items.length} ข้อ</span></span>
            <span class=${'pill ' + (full ? 'ok' : dn ? 'warn' : 'idle')}>${full ? 'ครบ' : dn ? 'ค้าง ' + (g.items.length - dn) : 'ยังไม่เริ่ม'}</span>
            <span style=${{ transform: 'rotate(' + (isOpen ? 90 : 0) + 'deg)', display: 'flex' }}><${Icon} d=${IC.next} size=${16} /></span></button>
          ${isOpen && html`<div style="padding: 0 10px 10px; display: flex; flex-direction: column; gap: 8px">
            ${onlyPending && visible.length < g.items.length && html`<div class="xs ok" style="border-radius: 10px; padding: 6px 10px">✓ ซ่อนข้อที่ประเมินแล้ว ${g.items.length - visible.length} ข้อ</div>`}
            ${visible.map(({ it, ii }) => renderItem(it, ii))}</div>`}
        </section>`; })}
      <div class="grid2" style="grid-template-columns: 1fr 1.6fr">
        <button class="btn" onClick=${() => { persist({}); toast('บันทึกร่างแล้ว'); }}>บันทึกร่าง</button>
        <button class="btn primary" onClick=${submit}>ส่งผลประเมิน ▶</button></div>
      ${mode === 2 && html`<a class="btn sm" href=${'#/parts/' + a.id}>ดูภาพรวม Part 1 / Part 2</a>`}
      </div>
    </div>
    <${Nav} active="/start" alerts=${alerts} />
    ${warn && html`<${Overlay} label="ประเมินยังไม่ครบ" onClose=${() => setWarn(false)}>
      <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center">
        <${Nurse} pose="tablet" w=${76} /><b style="font-size: 18px; color: var(--bad)">เน้นย้ำ! ยังประเมินไม่ครบ</b>
        <div class="small">เหลืออีก <b>${TOTAL - nDone} ข้อ</b> ใน ${GOALS.map((g, i) => (g.items.some((it) => !(a.results[it.id] && a.results[it.id].s)) ? 'G' + (i + 1) : null)).filter(Boolean).join(', ')}</div></div>
      <div class="grid2"><button class="btn" onClick=${() => { setWarn(false); toast('บันทึกร่างแล้ว'); }}>บันทึกร่างไว้ก่อน</button><button class="btn blue" onClick=${goPending}>ไปข้อที่ค้าง ›</button></div>
    </${Overlay}>`}
  </div>`;
}
