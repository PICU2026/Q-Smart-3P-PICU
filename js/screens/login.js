import { html, useState, Icon, IC, Nurse, Logo, go } from '../ui.js';
import { store } from '../store.js';

export function Login({ onLogin }) {
  const [u, setU] = useState(''); const [p, setP] = useState('');
  const [show, setShow] = useState(false); const [rm, setRm] = useState(true);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (!u || !p) { setErr('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน'); return; }
    setBusy(true);
    try { const user = await store.signIn(u, p); if (rm) localStorage.setItem('picu-last-user', u); onLogin(user); go('/'); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return html`<div class="phone noside">
    <header class="appbar" style="border-radius: 0 0 26px 26px"><${Logo} /><div class="t"><b>Q-Smart 3P PICU</b><small>Skin & Safety Assessment</small></div></header>
    <div class="content login-grid" style="padding-bottom: 30px">
      <div class="login-art">
      <div class="row" style="justify-content: center; align-items: flex-end; gap: 2px">
        <${Nurse} pose="wave" w=${150} />
        <div class="bubble pop" style="margin-bottom: 70px; border-radius: 22px 22px 22px 6px">
          <div style="font-size: 21px; font-weight: 700; color: var(--teal-d)">สวัสดีค่ะ !</div>
          <div style="font-size: 13.5px; line-height: 1.45">พร้อมเช็คความเสี่ยง<br />กันหรือยัง <span class="pulse" style="display: inline-block; color: #F0365A">♥</span></div>
        </div>
      </div>
      <div class="desk-only" style="flex-direction: column; align-items: center; gap: 6px; text-align: center"><b style="font-size: 26px; color: var(--teal-d)">ระบบประเมินความเสี่ยงขณะรับส่งเวร</b><span class="muted">หอผู้ป่วยวิกฤตเด็ก (PICU) · 9 Goal · ติดตามอุปกรณ์และวัน Exp</span></div>
      </div>
      <form class="card pop" style="padding: 20px 18px; gap: 14px; border-radius: 26px" onSubmit=${submit}>
        <label class="field">ชื่อผู้ใช้ (Username)
          <input class="input" autocomplete="username" value=${u} onInput=${(e) => setU(e.target.value)} placeholder="เช่น nurse001" /></label>
        <label class="field">รหัสผ่าน (Password)
          <span class="row" style="gap: 0">
            <input class="input" type=${show ? 'text' : 'password'} autocomplete="current-password" value=${p} onInput=${(e) => setP(e.target.value)} />
            <button type="button" class="iconbtn" style="background: transparent; color: var(--muted); margin-left: -44px" aria-label=${show ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'} onClick=${() => setShow(!show)}><${Icon} d=${show ? IC.eyeOff : IC.eye} /></button>
          </span></label>
        <div class="row" style="justify-content: space-between">
          <label class="row small" style="gap: 8px; min-height: 40px"><input type="checkbox" checked=${rm} onChange=${(e) => setRm(e.target.checked)} style="width: 20px; height: 20px; accent-color: #0B6A82" />จดจำฉันไว้</label>
          <a href="#/forgot" class="small" style="font-weight: 600">ลืมรหัสผ่าน?</a>
        </div>
        ${err && html`<div class="alertbox bad" role="alert"><${Icon} d=${IC.warn} />${err}</div>`}
        <button class="btn primary block" style="height: 54px; font-size: 17px" disabled=${busy}><${Icon} d=${IC.login} />${busy ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}</button>
        ${store.mode === 'demo' && html`<div class="xs muted" style="text-align: center">โหมดทดลอง: ใช้ <b>nurse001</b> / <b>1234</b> (หรือ nurse002, head)</div>`}
      </form>
    </div>
  </div>`;
}

export function Forgot() {
  return html`<div class="phone noside"><header class="appbar"><a class="iconbtn" href="#/login" aria-label="ย้อนกลับ"><${Icon} d=${IC.back} /></a><${Logo} /><div class="t"><b>ลืมรหัสผ่าน</b><small>Q-Smart 3P PICU</small></div></header>
    <div class="content"><div class="hero"><${Nurse} pose="tablet" w=${90} /><div class="bubble" style="margin-bottom: 20px">ติดต่อหัวหน้าหอหรือผู้ดูแลระบบ<br />เพื่อตั้งรหัสผ่านใหม่ให้นะคะ</div></div>
    <a class="btn primary" href="#/login">กลับไปหน้าเข้าสู่ระบบ</a></div></div>`;
}
