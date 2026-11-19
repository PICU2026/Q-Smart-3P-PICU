import { html, useState, useEffect, useData, Icon, IC, AppBar, Nav, Spinner, ErrorBox, Overlay, toast } from '../ui.js';
import { store } from '../store.js';
import { DEV_TYPES, T } from '../goals.js';
import { todayISO, addDaysISO, thDate, thShort } from '../dates.js';
import { devStatus, DST, dueText, expOf } from '../logic.js';

const FL = [['all', 'ทั้งหมด', 'info'], ['use', 'ใช้งาน', 'ok'], ['soon', 'ใกล้หมด', 'warn'], ['exp', 'หมดอายุ', 'bad'], ['removed', 'ถอดแล้ว', 'idle']];
const inF = (f, s) => f === 'all' || (f === 'use' ? s === 'ok' || s === 'noexp' : s === f);
const REMOVE_REASONS = ['ครบกำหนดการรักษา', 'หมดอายุ / เปลี่ยนใหม่', 'อุปกรณ์เลื่อนหลุด', 'แพทย์สั่งถอด', 'อื่น ๆ'];

export function Devices({ user, alerts, query, onChanged }) {
  const pts = useData(() => store.listPatients('active'), []);
  const [pid, setPid] = useState(query.p || null);
  const [f, setF] = useState('all');
  const [sheet, setSheet] = useState(null); // {kind:'detail'|'add'|'hist', dev}
  const [act, setAct] = useState('exp');
  const [form, setForm] = useState({});
  useEffect(() => { if (!pid && pts.data && pts.data.length) setPid(pts.data[0].id); }, [pts.data]);
  const devs = useData(() => (pid ? store.listDevices(pid) : Promise.resolve([])), [pid]);
  if (pts.loading && !pts.data) return html`<div class="phone"><${AppBar} alerts=${alerts} /><${Spinner} /></div>`;
  if (pts.error) return html`<div class="phone"><${AppBar} alerts=${alerts} /><div class="content"><${ErrorBox} error=${pts.error} /></div></div>`;
  const list = devs.data || [];
  const items = list.filter((d) => inF(f, devStatus(d)));
  const set = (k, v) => setForm(Object.assign({}, form, { [k]: v }));
  const done = async (msg) => { setSheet(null); await devs.reload(); toast(msg); if (onChanged) onChanged(); };
  const open = (d) => { setAct('exp'); setForm({ exp: d.exp_date || expOf(d) || '', start: todayISO(), none: !!d.no_exp, reason: REMOVE_REASONS[0], removed: todayISO() }); setSheet({ kind: 'detail', dev: d }); };
  const apply = async () => {
    const d = sheet.dev; const t = DEV_TYPES[d.type] || { life: -1 };
    try {
      if (act === 'exp') await store.updateDevice(d.id, { exp_date: form.none ? null : form.exp || null, no_exp: !!form.none }, 'exp', form.none ? 'ตั้งเป็นไม่มีวัน Exp' : 'เปลี่ยนวันหมดอายุ → ' + thShort(form.exp), user.name);
      if (act === 'rep') await store.updateDevice(d.id, { start_date: form.start, exp_date: form.none ? null : t.life > 0 ? addDaysISO(form.start, t.life) : form.exp || null, no_exp: !!form.none, removed_at: null, remove_reason: null }, 'replace', 'เปลี่ยนอุปกรณ์ใหม่ เริ่ม ' + thShort(form.start), user.name);
      if (act === 'rem') await store.updateDevice(d.id, { removed_at: form.removed, remove_reason: form.reason }, 'remove', 'ถอดอุปกรณ์ · ' + form.reason, user.name);
      done('บันทึกแล้ว');
    } catch (x) { toast('บันทึกไม่สำเร็จ: ' + x.message); }
  };
  const add = async () => {
    const t = DEV_TYPES[form.type];
    if (!form.start) { toast('กรุณาใส่วันที่เริ่มใช้'); return; }
    try {
      await store.addDevice(pid, { type: form.type, start_date: form.start, exp_date: form.none ? null : t.life > 0 ? addDaysISO(form.start, t.life) : form.exp || null, no_exp: !!form.none }, user.name, form.none ? 'เพิ่มอุปกรณ์ · ไม่มีวัน Exp' : 'เพิ่มอุปกรณ์');
      done('เพิ่มอุปกรณ์แล้ว');
    } catch (x) { toast('บันทึกไม่สำเร็จ: ' + x.message); }
  };
  const tOf = (d) => DEV_TYPES[d.type] || { name: d.type, life: -1, icon: IC.steth, tone: 'teal' };
  const NoExp = () => html`<label class="row small" style="gap: 8px; min-height: 36px"><input type="checkbox" checked=${!!form.none} onChange=${(e) => set('none', e.target.checked)} style="width: 20px; height: 20px; accent-color: #0B6A82" />ไม่มีวัน Exp (เช่น ศัลยกรรมใส่ NG ให้)</label>`;

  return html`<div class="phone">
    <${AppBar} alerts=${alerts} sub="อุปกรณ์ (Device) · วันเริ่มและวันหมดอายุ" />
    <div class="content">
      <section class="card" style="flex-direction: row; align-items: center">
        <span class="tile info" style="width: 40px; height: 40px"><${Icon} d=${IC.bed} size=${22} /></span>
        <label class="field" style="flex: 1">เลือกเตียงที่จะดูอุปกรณ์
          <select class="input" style="font-weight: 700; color: var(--teal-d); background: #fff" value=${pid || ''} onChange=${(e) => { setPid(e.target.value); setF('all'); }}>
            ${(pts.data || []).map((p) => html`<option value=${p.id}>เตียง ${p.bed} · Code ${p.code}</option>`)}</select></label></section>
      <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px">
        ${FL.map(([k, label, cls]) => html`<button class=${'choice ' + cls} style=${{ padding: '6px 2px', borderColor: f === k ? 'currentColor' : 'transparent' }} aria-pressed=${f === k} onClick=${() => setF(k)}>
          <span style="font-size: 10px">${label}</span><b style="font-size: 17px">${list.filter((d) => inF(k, devStatus(d))).length}</b></button>`)}</div>
      ${devs.loading && !devs.data ? html`<${Spinner} />` : items.length === 0 ? html`<div class="small muted" style="text-align: center; padding: 16px">ไม่มีอุปกรณ์ในกลุ่มนี้</div>` : ''}
      <div class="dlist">${items.map((d) => { const t = tOf(d); const s = devStatus(d); const tone = T[t.tone] || T.teal; return html`<button class="card" style=${{ flexDirection: 'row', alignItems: 'center', border: '1.5px solid ' + (s === 'exp' ? '#F7AFBB' : s === 'soon' ? '#F2D08A' : '#fff'), textAlign: 'left' }} onClick=${() => open(d)}>
        <span class="tile" style=${{ width: '48px', height: '48px', borderRadius: '15px', background: tone[0], color: tone[1] }}><${Icon} d=${t.icon} size=${26} stroke=${1.8} /></span>
        <span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px"><b style="font-size: 14px">${t.name}</b><span class="xs muted">เริ่มใช้ ${thShort(d.start_date)}</span>
          <span class="xs" style=${{ color: s === 'exp' ? '#B4233C' : s === 'soon' ? '#7A4A00' : '#526577' }}>${dueText(d)}</span></span>
        <span class=${'pill ' + DST[s][1]}>${DST[s][0]}</span><${Icon} d=${IC.next} size=${16} /></button>`; })}</div>
      <section class="card" style="gap: 6px"><b class="small">อายุการใช้งานมาตรฐาน (คำนวณ Exp อัตโนมัติ)</b>
        <div class="row" style="flex-wrap: wrap; gap: 5px">${Object.values(DEV_TYPES).filter((t) => t.life > 0).map((t) => html`<span class="pill info">${t.name} ${t.life} วัน</span>`)}</div></section>
      <div class="grid2" style="grid-template-columns: 1.3fr 1fr; max-width: 640px">
        <button class="btn green" disabled=${!pid} onClick=${() => { setForm({ type: 'ng', start: todayISO(), exp: '', none: false }); setSheet({ kind: 'add' }); }}><${Icon} d=${IC.plus} />เพิ่มอุปกรณ์</button>
        <button class="btn" disabled=${!pid} onClick=${() => setSheet({ kind: 'hist' })}>ประวัติการเปลี่ยน</button></div>
    </div>
    <${Nav} active="/devices" alerts=${alerts} />

    ${sheet && sheet.kind === 'detail' && (() => { const d = sheet.dev; const t = tOf(d); const s = devStatus(d); const tone = T[t.tone] || T.teal; return html`<${Overlay} bottom label="จัดการอุปกรณ์" onClose=${() => setSheet(null)}>
      <div class="row"><span class="tile" style=${{ width: '46px', height: '46px', background: tone[0], color: tone[1] }}><${Icon} d=${t.icon} size=${26} /></span>
        <div style="flex: 1"><b style="font-size: 16px">${t.name}</b><div class="xs muted">เริ่มใช้ ${thShort(d.start_date)} · ${dueText(d)}</div></div><span class=${'pill ' + DST[s][1]}>${DST[s][0]}</span></div>
      <div class="grid3" role="tablist">
        ${[['exp', 'เปลี่ยนวันหมดอายุ', IC.cal], ['rep', 'เปลี่ยนอุปกรณ์', IC.refresh], ['rem', 'ถอดอุปกรณ์', IC.minus]].map(([k, label, icon]) => html`<button role="tab" aria-selected=${act === k}
          class=${'choice' + (act === k ? ' on' : '')} style=${{ color: k === 'rem' ? '#B4233C' : '#0B6A82', borderColor: act === k ? (k === 'rem' ? '#F0365A' : '#0B6A82') : '' }} onClick=${() => setAct(k)}><${Icon} d=${icon} /><span class="xs" style="font-weight: 600">${label}</span></button>`)}</div>
      ${act === 'exp' && html`<label class="field">วันหมดอายุใหม่<input class="input" type="date" disabled=${form.none} value=${form.exp} onChange=${(e) => set('exp', e.target.value)} /></label><${NoExp} />`}
      ${act === 'rep' && html`<label class="field">วันที่เปลี่ยนอุปกรณ์ใหม่ (วันเริ่มใช้)<input class="input" type="date" value=${form.start} onChange=${(e) => set('start', e.target.value)} /></label>
        ${t.life > 0 ? html`<div class="ok small" style="border-radius: 12px; padding: 8px 12px">วัน Exp ใหม่ (คำนวณให้): <b>${form.none ? 'ไม่มีวัน Exp' : thDate(addDaysISO(form.start, t.life))}</b></div>`
          : t.life === -1 ? html`<label class="field">วันหมดอายุ<input class="input" type="date" disabled=${form.none} value=${form.exp} onChange=${(e) => set('exp', e.target.value)} /></label>` : ''}<${NoExp} />`}
      ${act === 'rem' && html`<label class="field">วันที่ถอด<input class="input" type="date" value=${form.removed} onChange=${(e) => set('removed', e.target.value)} /></label>
        <label class="field">เหตุผล<select class="input" value=${form.reason} onChange=${(e) => set('reason', e.target.value)}>${REMOVE_REASONS.map((r) => html`<option>${r}</option>`)}</select></label>`}
      <div class="grid2" style="grid-template-columns: 1fr 1.6fr"><button class="btn" onClick=${() => setSheet(null)}>ยกเลิก</button>
        <button class=${'btn ' + (act === 'rem' ? 'danger' : 'primary')} onClick=${apply}>${act === 'rem' ? 'ยืนยันถอด' : 'บันทึก'}</button></div>
      <b class="small">ประวัติการใช้งาน</b>
      ${(d.events || []).map((e) => html`<div class="row xs" style="align-items: flex-start"><span style="flex: none; width: 9px; height: 9px; margin-top: 4px; border-radius: 999px; background: var(--teal)"></span><span>${thShort(e.created_at)} · ${e.detail}${e.by_name ? ' (' + e.by_name + ')' : ''}</span></div>`)}
    </${Overlay}>`; })()}

    ${sheet && sheet.kind === 'add' && html`<${Overlay} bottom label="เพิ่มอุปกรณ์" onClose=${() => setSheet(null)}>
      <b style="font-size: 17px; color: var(--ok)">+ เพิ่มอุปกรณ์</b>
      <label class="field">ประเภทอุปกรณ์ *<select class="input" value=${form.type} onChange=${(e) => set('type', e.target.value)}>${Object.entries(DEV_TYPES).map(([k, t]) => html`<option value=${k}>${t.name}</option>`)}</select></label>
      <label class="field">วันที่เริ่มใช้ *<input class="input" type="date" value=${form.start} onChange=${(e) => set('start', e.target.value)} /></label>
      ${DEV_TYPES[form.type].life === -1 && html`<label class="field">วันหมดอายุ<input class="input" type="date" disabled=${form.none} value=${form.exp} onChange=${(e) => set('exp', e.target.value)} /></label>`}
      ${DEV_TYPES[form.type].life > 0 && html`<div class="ok small" style="border-radius: 12px; padding: 8px 12px">วัน Exp (คำนวณให้): <b>${form.none ? 'ไม่มีวัน Exp' : form.start ? thDate(addDaysISO(form.start, DEV_TYPES[form.type].life)) : '-'}</b></div>`}
      <${NoExp} />
      <div class="grid2" style="grid-template-columns: 1fr 1.6fr"><button class="btn" onClick=${() => setSheet(null)}>ยกเลิก</button><button class="btn green" onClick=${add}>บันทึก</button></div>
    </${Overlay}>`}

    ${sheet && sheet.kind === 'hist' && html`<${Overlay} bottom label="ประวัติการเปลี่ยนอุปกรณ์" onClose=${() => setSheet(null)}>
      <b style="font-size: 17px; color: var(--teal-d)">ประวัติการเปลี่ยนแปลง</b>
      ${list.flatMap((d) => (d.events || []).map((e) => ({ e, name: tOf(d).name }))).sort((x, y) => y.e.created_at.localeCompare(x.e.created_at)).map(({ e, name }) => html`<div class="small" style="padding: 6px 0; border-top: 1px solid #EEF4F6"><b>${name}</b> · ${thShort(e.created_at)} · ${e.detail}${e.by_name ? ' (' + e.by_name + ')' : ''}</div>`)}
      <button class="btn" onClick=${() => setSheet(null)}>ปิด</button>
    </${Overlay}>`}
  </div>`;
}
