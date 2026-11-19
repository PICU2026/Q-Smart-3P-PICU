import { html, useData, Icon, IC, Nurse, Bed, AppBar, Nav, Spinner, ErrorBox } from '../ui.js';
import { store } from '../store.js';
import { GOALS, T, TOTAL, PART_RANGE } from '../goals.js';
import { shiftOf, thDate, hhmm } from '../dates.js';
import { answered, partDone, failCount } from '../logic.js';

function useAssessment(id) {
  return useData(async () => { const a = await store.getAssessment(id); if (!a) throw new Error('ไม่พบแบบประเมินนี้'); const p = await store.getPatient(a.patient_id); return { a, p }; }, [id]);
}

export function Result({ alerts, params }) {
  const d = useAssessment(params.id);
  if (d.loading && !d.data) return html`<div class="phone"><${AppBar} back="/" alerts=${alerts} /><${Spinner} /></div>`;
  if (d.error) return html`<div class="phone"><${AppBar} back="/" alerts=${alerts} /><div class="content"><${ErrorBox} error=${d.error} /></div></div>`;
  const { a, p } = d.data;
  const n = answered(a); const pct = Math.round(n / TOTAL * 100); const fails = failCount(a);
  const gDone = GOALS.filter((g) => g.items.every((it) => a.results[it.id] && a.results[it.id].s)).length;
  const complete = n === TOTAL;
  return html`<div class="phone">
    <${AppBar} back="/" alerts=${alerts} />
    <div class="content split even">
      <div class="side">
      <section class="hero"><${Nurse} pose=${complete ? 'cheer' : 'tablet'} w=${80} />
        <div style="flex: 1; padding-bottom: 16px"><div class="bubble pop" style="display: inline-block; border-radius: 999px; padding: 8px 16px"><b style="font-size: 17px; color: var(--teal-d)">ผลการประเมินรายเตียง</b></div></div>
        <div style="align-self: center"><${Bed} w=${84} /></div></section>
      <section class="card" style="display: grid; grid-template-columns: 64px 1fr 1fr; align-items: center">
        <div style="text-align: center; color: var(--teal-d); border-right: 1px solid #E3EEF1"><${Icon} d=${IC.bed} size=${26} /><div class="xs">เตียง</div><b style="font-size: 26px; line-height: 1">${p.bed}</b></div>
        <div class="small" style="display: flex; flex-direction: column; gap: 3px"><b style="font-size: 15px">Code ${p.code}</b><span>วันที่ ${thDate(a.date)}</span><span style="color: var(--warn)">${shiftOf(a.shift).name} ${shiftOf(a.shift).time} น.</span></div>
        <div class=${complete ? 'ok' : 'warn'} style="border-radius: 16px; padding: 8px; text-align: center">
          <div class="xs" style="font-weight: 600">${complete ? '✓ ประเมินแล้ว' : 'ยังไม่ครบ'}</div><b style="font-size: 26px; line-height: 1.1">${pct}%</b>
          <div class="xs" style="font-weight: 600">${complete ? (fails ? 'มีข้อไม่ผ่าน ' + fails : 'ครบถ้วนแล้ว') : 'ค้าง ' + (TOTAL - n) + ' ข้อ'}</div></div>
      </section>
      <div class="grid3 xs muted">
        <div class="card" style="padding: 8px; gap: 2px">ผู้ประเมิน<b style="color: var(--ink)">${a.mode === 2 ? (a.part1_by || '-') + ', ' + (a.part2_by || '-') : a.part1_by || '-'}</b></div>
        <div class="card" style="padding: 8px; gap: 2px">อัปเดตล่าสุด<b style="color: var(--ink)">${a.updated_at ? hhmm(a.updated_at) + ' น.' : '-'}</b></div>
        <div class="card" style="padding: 8px; gap: 2px">รูปแบบ<b style="color: var(--ink)">ประเมิน ${a.mode === 2 ? '2' : '1'} ท่าน</b></div></div>
      <section class="card"><h2>สรุปผลการประเมิน</h2>
        <div class="grid3" style="text-align: center">
          <div class="info" style="border-radius: 14px; padding: 8px"><div class="xs">Goal ที่ประเมิน</div><b style="font-size: 20px">${gDone}/9</b></div>
          <div class="info" style="border-radius: 14px; padding: 8px"><div class="xs">รายการที่ประเมิน</div><b style="font-size: 20px">${n}/${TOTAL}</b></div>
          <div class=${fails ? 'bad' : 'ok'} style="border-radius: 14px; padding: 8px"><div class="xs">ไม่ผ่าน</div><b style="font-size: 20px">${fails} ข้อ</b></div></div></section>
      </div>
      <div class="main">
      <section class="card" style="gap: 4px"><h2 style="margin-bottom: 4px">ผลการประเมินราย Goal (9 Goal)</h2>
        ${GOALS.map((g, i) => { const dn = g.items.filter((it) => a.results[it.id] && a.results[it.id].s).length; const f = g.items.filter((it) => a.results[it.id] && a.results[it.id].s === 'f');
          const cls = dn < g.items.length ? 'warn' : f.length ? 'bad' : 'ok'; const label = dn < g.items.length ? 'ค้าง ' + (g.items.length - dn) : f.length ? 'ไม่ผ่าน ' + f.length : '✓ ผ่าน';
          return html`<div style="padding: 6px 0; border-top: 1px solid #EEF4F6"><div class="row">
            <span style="flex: none; width: 22px; height: 22px; border-radius: 999px; background: var(--teal-l); color: var(--teal-d); font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center">${i + 1}</span>
            <span class="tile" style=${{ width: '30px', height: '30px', background: T[g.tone][0], color: T[g.tone][1] }}><${Icon} d=${g.icon} size=${17} /></span>
            <span style="flex: 1; font-size: 12.5px">${g.title} <span class="xs muted">(${dn}/${g.items.length})</span></span><span class=${'pill ' + cls}>${label}</span></div>
            ${f.map((it) => html`<div class="xs" style="margin: 4px 0 0 60px; color: var(--bad)">✕ ${it.t}${a.results[it.id].note ? ' — ' + a.results[it.id].note : ''}</div>`)}</div>`; })}
      </section>
      <div class="grid3">
        <a class="btn sm" href=${'#/assess/' + a.id}>${complete ? 'แก้ไขผล' : 'ประเมินต่อ'}</a>
        <a class="btn sm" href="#/report">รายงานทั้งหมด</a>
        <a class="btn sm blue" href="#/">กลับหน้าหลัก</a></div>
      </div>
    </div>
    <${Nav} active="/report" alerts=${alerts} />
  </div>`;
}

export function Parts({ alerts, params }) {
  const d = useAssessment(params.id);
  if (d.loading && !d.data) return html`<div class="phone"><${AppBar} back="/" alerts=${alerts} /><${Spinner} /></div>`;
  if (d.error) return html`<div class="phone"><${AppBar} back="/" alerts=${alerts} /><div class="content"><${ErrorBox} error=${d.error} /></div></div>`;
  const { a, p } = d.data;
  const card = (pp, tot, who) => { const dn = partDone(a, pp); const full = dn === tot; const dash = (dn / tot) * 94.2;
    return html`<div class="card" style=${{ flexDirection: 'row', alignItems: 'center', gap: '12px', background: full ? 'linear-gradient(115deg,#EAF8EE,#F6FCF8)' : 'linear-gradient(115deg,#FFF4E0,#FFFBF2)', border: '1.5px solid ' + (full ? '#A9DDBC' : '#F2D08A') }}>
      <svg role="img" aria-label=${'ความคืบหน้า ' + dn + ' จาก ' + tot} width="62" height="62" viewBox="0 0 36 36" style="flex: none"><circle cx="18" cy="18" r="15" fill="#fff" stroke="#EEE6D2" stroke-width="4"></circle>
        <circle cx="18" cy="18" r="15" fill="none" stroke=${full ? '#17663A' : '#E88A1A'} stroke-width="4" stroke-linecap="round" stroke-dasharray=${dash + ' 94.2'} transform="rotate(-90 18 18)"></circle>
        <text x="18" y="21" text-anchor="middle" font-size="8.5" font-weight="700" fill="#12324A" font-family="Prompt, sans-serif">${dn}/${tot}</text></svg>
      <div style="flex: 1; min-width: 0"><b style="font-size: 17px">Part ${pp}</b> <span class="xs muted">${PART_RANGE[pp]}</span><br />
        <span class=${'pill ' + (full ? 'ok' : 'warn')}>${full ? '✓ ครบ ' + dn + '/' + tot : 'ค้าง ' + (tot - dn) + ' ข้อ จาก ' + tot}</span><div class="xs muted">โดย ${who || 'ยังไม่ระบุ'}</div></div>
      <a class=${'btn sm ' + (full ? '' : 'primary')} href=${'#/assess/' + a.id}>${full ? 'แก้ไข' : 'ประเมินต่อ ▶'}</a></div>`; };
  return html`<div class="phone">
    <${AppBar} back="/" alerts=${alerts} />
    <div class="content">
      <section class="hero"><${Nurse} pose="tablet" w=${86} />
        <div style="flex: 1; padding-bottom: 16px"><div class="bubble pop"><b style="font-size: 17px; color: var(--teal-d)">เลือกส่วนการประเมิน</b><div class="xs muted" style="letter-spacing: .04em; font-weight: 600">SELECT PART / CONTINUE</div></div></div>
        <div style="align-self: center"><${Bed} w=${80} /></div></section>
      <section class="card small" style="flex-direction: row; flex-wrap: wrap; gap: 6px 12px; align-items: center"><span>${thDate(a.date)}</span><span class="pill warn">${shiftOf(a.shift).name}</span><b>เตียง ${p.bed} · Code ${p.code}</b></section>
      <div class="dgrid2">${card(1, 15, a.part1_by)}${card(2, 21, a.part2_by)}</div>
      <a class="btn" href=${'#/result/' + a.id}><${Icon} d=${IC.chart} size=${18} />ดูผลรวมการประเมิน ›</a>
    </div>
    <${Nav} active="/start" alerts=${alerts} />
  </div>`;
}
