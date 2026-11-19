import { html, useState, useData, Icon, IC, Nurse, AppBar, Nav, Spinner, ErrorBox } from '../ui.js';
import { store } from '../store.js';
import { DEV_TYPES } from '../goals.js';
import { todayISO, currentShift, shiftOf, thShort } from '../dates.js';
import { devStatus, expOf, assessStatus, partDone, bedLink } from '../logic.js';

export function Alerts({ alerts }) {
  const date = todayISO(); const shift = currentShift();
  const [f, setF] = useState('all');
  const d = useData(() => Promise.all([store.listActiveDevices(), store.listPatients('active'), store.listAssessments(date, date)]), [date]);
  if (d.loading && !d.data) return html`<div class="phone"><${AppBar} alerts=${alerts} /><${Spinner} /></div>`;
  if (d.error) return html`<div class="phone"><${AppBar} alerts=${alerts} /><div class="content"><${ErrorBox} error=${d.error} /></div></div>`;
  const [devs, patients, asses] = d.data;
  const list = [];
  devs.forEach((x) => {
    const s = devStatus(x); const name = (DEV_TYPES[x.type] || { name: x.type }).name;
    if (s === 'soon') list.push({ g: 'exp', cls: 'warn', icon: IC.clock, kind: 'หมดอายุพรุ่งนี้/วันนี้', title: 'เตียง ' + x.patient.bed + ' · ' + name, body: 'หมดอายุ ' + thShort(expOf(x)) + ' · เริ่มใช้ ' + thShort(x.start_date) + ' · แนะนำเปลี่ยนเวรดึก', href: '/devices?p=' + x.patient_id, cta: 'จัดการอุปกรณ์', sort: 1 });
    if (s === 'exp') list.push({ g: 'exp', cls: 'bad', icon: IC.warn, kind: 'หมดอายุแล้ว', title: 'เตียง ' + x.patient.bed + ' · ' + name, body: 'หมดอายุ ' + thShort(expOf(x)) + ' กรุณาเปลี่ยนหรือแก้วัน Exp', href: '/devices?p=' + x.patient_id, cta: 'จัดการอุปกรณ์', sort: 0 });
  });
  const none = []; patients.forEach((p) => {
    const a = asses.find((x) => x.patient_id === p.id && x.shift === shift); const s = assessStatus(a);
    if (s === 'part') list.push({ g: 'assess', cls: 'blue', icon: IC.clip, kind: 'ประเมินค้าง', title: 'เตียง ' + p.bed + ' · ' + p.code, body: 'Part 1 ' + partDone(a, 1) + '/15 · Part 2 ' + partDone(a, 2) + '/21', href: bedLink(p, a), cta: 'ประเมินต่อ', sort: 2 });
    if (s === 'none') none.push(p.bed);
  });
  if (none.length) list.push({ g: 'assess', cls: 'info', icon: IC.clip, kind: 'ยังไม่ประเมิน', title: shiftOf(shift).name + ': ยังไม่เริ่มประเมิน ' + none.length + ' เตียง', body: 'เตียง ' + none.join(', '), href: '/start', cta: 'เริ่มประเมิน', sort: 3 });
  if (!list.length) list.push({ g: 'done', cls: 'ok', icon: IC.check, kind: 'เรียบร้อย', title: 'ไม่มีรายการที่ต้องติดตาม', body: 'อุปกรณ์และการประเมินเวรนี้เรียบร้อยดี', href: '/', cta: 'กลับหน้าหลัก', sort: 9 });
  list.sort((a, b) => a.sort - b.sort);
  const soon = devs.filter((x) => devStatus(x) === 'soon').length;
  const cnt = (g) => list.filter((x) => x.g === g).length;
  const shown = list.filter((x) => f === 'all' || x.g === f);
  return html`<div class="phone">
    <${AppBar} alerts=${alerts} sub="แจ้งเตือน Exp ทุกเตียง · ล่วงหน้า 1 วัน" />
    <div class="content">
      <section class="hero" style="background: linear-gradient(115deg, #FFFFFF 0%, #FFF4E6 100%)"><${Nurse} pose="tablet" w=${80} />
        <div style="flex: 1; padding-bottom: 12px"><div class="bubble pop" style="border-color: #F2D08A">
          <b style="color: #A35410">${soon ? 'มีอุปกรณ์จะหมดอายุภายใน 1 วัน ' + soon + ' รายการ' : 'ยังไม่มีอุปกรณ์ใกล้หมดอายุ'}</b>
          <div class="xs">${soon ? 'แนะนำเปลี่ยนในเวรดึกนะคะ' : 'เยี่ยมมากค่ะ'}</div></div></div></section>
      <div class="row" role="tablist" style="flex-wrap: wrap; gap: 6px">
        ${[['all', 'ทั้งหมด (' + list.length + ')'], ['exp', 'อุปกรณ์ Exp (' + cnt('exp') + ')'], ['assess', 'การประเมิน (' + cnt('assess') + ')']].map(([k, label]) => html`<button role="tab" aria-selected=${f === k}
          class=${'chip' + (f === k ? ' on' : '')} style="min-height: 36px" onClick=${() => setF(k)}>${label}</button>`)}
        <button class="chip" style="border: none" onClick=${d.reload}>รีเฟรช</button></div>
      <div class="dlist">${shown.map((x) => html`<article class="card" style="flex-direction: row; gap: 10px">
        <span class=${'tile ' + x.cls} style="width: 44px; height: 44px"><${Icon} d=${x.icon} size=${24} /></span>
        <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">
          <span class=${'pill ' + x.cls} style="align-self: flex-start">${x.kind}</span><b style="font-size: 13.5px">${x.title}</b><span class="xs">${x.body}</span>
          <a class="btn sm" style="align-self: flex-start; margin-top: 4px" href=${'#' + x.href}>${x.cta} ›</a></div></article>`)}</div>
    </div>
    <${Nav} active="/alerts" alerts=${alerts} />
  </div>`;
}
