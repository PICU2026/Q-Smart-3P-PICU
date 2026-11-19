// Data layer: Supabase when configured, otherwise a demo store in localStorage.
import { SUPABASE_URL, SUPABASE_ANON_KEY, USERNAME_DOMAIN } from './config.js';
import { ALL_ITEMS, PART_OF } from './goals.js';
import { todayISO, currentShift, addDaysISO } from './dates.js';

const useSupabase = !!(SUPABASE_URL && SUPABASE_ANON_KEY);
const uid = () => (globalThis.crypto && crypto.randomUUID ? crypto.randomUUID() : 'id-' + Math.random().toString(36).slice(2) + Date.now());
const nowISO = () => new Date().toISOString();

/* ------------------------------------------------------------------ */
/* Demo store (localStorage)                                            */
/* ------------------------------------------------------------------ */
const KEY = 'picu-demo-v1';
const mem = {};
const ls = globalThis.localStorage || { getItem: (k) => mem[k] || null, setItem: (k, v) => { mem[k] = v; }, removeItem: (k) => { delete mem[k]; } };

function seed() {
  const today = todayISO();
  const shift = currentShift();
  const d = (n) => addDaysISO(today, n);
  const patients = [];
  for (let i = 1; i <= 11; i++) {
    const n = String(i).padStart(2, '0');
    patients.push({ id: 'p' + n, code: 'P0' + n, bed: n, status: 'active', admitted_at: d(-9) + 'T08:00:00', discharged_at: null, discharge_reason: null,
      baseline: { band1: 'ข้อมือซ้าย', band2: 'ข้อเท้าขวา', allergy: 'หัวเตียง', ettNo: '4.5', ettCm: '13', blow: '2', cuff: '20', cxr: '1.5', _meta: {} } });
  }
  patients.push({ id: 'p12', code: 'P012', bed: '02', status: 'discharged', admitted_at: d(-20) + 'T08:00:00', discharged_at: d(-2) + 'T14:00:00', discharge_reason: 'ย้ายไปหอผู้ป่วยอื่น', baseline: { _meta: {} } });
  const dev = (pid, type, start, exp, extra) => Object.assign({ id: uid(), patient_id: pid, type, start_date: start, exp_date: exp, no_exp: exp === null && type !== 'fc', removed_at: null, remove_reason: null, created_at: nowISO() }, extra || {});
  const devices = [
    dev('p02', 'circuit', d(-7), d(7)), dev('p02', 'filter', d(-1), d(1)), dev('p02', 'suction', d(-5), d(2)),
    dev('p02', 'ng', d(-4), null), dev('p02', 'aline', d(-6), d(-1)), dev('p02', 'fc', d(-9), null, { no_exp: false }),
    dev('p02', 'cline', d(-9), d(5), { removed_at: d(-2), remove_reason: 'ครบกำหนดการรักษา' }),
    dev('p04', 'ng', d(-6), d(1)), dev('p04', 'circuit', d(-4), d(10)),
    dev('p01', 'circuit', d(-3), d(11)), dev('p01', 'suction', d(-2), d(5)),
    dev('p07', 'filter', d(-1), d(1))
  ];
  const events = devices.map((x) => ({ id: uid(), device_id: x.id, action: 'add', detail: 'เริ่มใช้ (ข้อมูลตัวอย่าง)', by_name: 'Nurse004', created_at: nowISO() }));
  const full = (by) => { const r = {}; ALL_ITEMS.forEach((it) => { r[it.id] = { s: 'p', by }; }); return r; };
  const assessments = [];
  const mk = (pid, results, submitted, mode) => assessments.push({ id: uid(), patient_id: pid, date: today, shift, mode: mode || 2, part1_by: 'Nurse001', part2_by: 'Nurse002', results, submitted, updated_at: nowISO() });
  ['p01', 'p05', 'p06', 'p08', 'p10', 'p11'].forEach((p) => mk(p, full('Nurse001'), true));
  const p02 = {}; ALL_ITEMS.forEach((it) => { if (PART_OF[it.gi] === 1 || (it.gi === 4 && it.ii < 9)) p02[it.id] = { s: 'p', by: 'Nurse001' }; });
  mk('p02', p02, false);
  const p04 = {}; ALL_ITEMS.slice(0, 8).forEach((it) => { p04[it.id] = { s: 'p', by: 'Nurse003' }; });
  mk('p04', p04, false, 1);
  const users = [
    { id: 'u1', username: 'nurse001', password: '1234', name: 'Nurse001', role: 'nurse' },
    { id: 'u2', username: 'nurse002', password: '1234', name: 'Nurse002', role: 'nurse' },
    { id: 'u3', username: 'head', password: '1234', name: 'หัวหน้าหอ', role: 'head' }
  ];
  return { users, patients, devices, events, assessments, session: null };
}
function load() {
  try { const raw = ls.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) { /* ignore */ }
  const db = seed(); save(db); return db;
}
function save(db) { ls.setItem(KEY, JSON.stringify(db)); }
const clone = (x) => JSON.parse(JSON.stringify(x));

const demo = {
  mode: 'demo',
  async session() { const db = load(); return db.session ? clone(db.session) : null; },
  async signIn(username, password) {
    const db = load();
    const u = db.users.find((x) => x.username === String(username || '').trim().toLowerCase() && x.password === password);
    if (!u) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    db.session = { id: u.id, username: u.username, name: u.name, role: u.role }; save(db); return clone(db.session);
  },
  async signOut() { const db = load(); db.session = null; save(db); },
  async listProfiles() { return load().users.map((u) => ({ id: u.id, username: u.username, name: u.name, role: u.role })); },
  async listPatients(status) { const db = load(); return clone(db.patients.filter((p) => !status || p.status === status)).sort((a, b) => a.bed.localeCompare(b.bed)); },
  async getPatient(id) { return clone(load().patients.find((p) => p.id === id) || null); },
  async addPatient(p, devices, by) {
    const db = load();
    const np = Object.assign({ id: uid(), status: 'active', admitted_at: nowISO(), discharged_at: null, discharge_reason: null, baseline: { _meta: {} } }, p);
    db.patients.push(np);
    (devices || []).forEach((d) => { const nd = Object.assign({ id: uid(), patient_id: np.id, removed_at: null, remove_reason: null, created_at: nowISO() }, d); db.devices.push(nd);
      db.events.push({ id: uid(), device_id: nd.id, action: 'add', detail: 'บันทึกตอนรับผู้ป่วย', by_name: by, created_at: nowISO() }); });
    save(db); return clone(np);
  },
  async updatePatient(id, patch) { const db = load(); const p = db.patients.find((x) => x.id === id); Object.assign(p, patch); save(db); return clone(p); },
  async listDevices(pid) {
    const db = load();
    return clone(db.devices.filter((d) => d.patient_id === pid).map((d) => Object.assign({}, d, { events: db.events.filter((e) => e.device_id === d.id).sort((a, b) => b.created_at.localeCompare(a.created_at)) })));
  },
  async listActiveDevices() {
    const db = load(); const act = {}; db.patients.forEach((p) => { if (p.status === 'active') act[p.id] = p; });
    return clone(db.devices.filter((d) => act[d.patient_id] && !d.removed_at).map((d) => Object.assign({}, d, { patient: { code: act[d.patient_id].code, bed: act[d.patient_id].bed } })));
  },
  async addDevice(pid, d, by, note) {
    const db = load(); const nd = Object.assign({ id: uid(), patient_id: pid, removed_at: null, remove_reason: null, created_at: nowISO() }, d);
    db.devices.push(nd); db.events.push({ id: uid(), device_id: nd.id, action: 'add', detail: note || 'เพิ่มอุปกรณ์', by_name: by, created_at: nowISO() }); save(db); return clone(nd);
  },
  async updateDevice(id, patch, action, detail, by) {
    const db = load(); const d = db.devices.find((x) => x.id === id); Object.assign(d, patch);
    db.events.push({ id: uid(), device_id: id, action, detail, by_name: by, created_at: nowISO() }); save(db); return clone(d);
  },
  async getAssessment(id) { return clone(load().assessments.find((a) => a.id === id) || null); },
  async findAssessment(pid, date, shift) { return clone(load().assessments.find((a) => a.patient_id === pid && a.date === date && a.shift === shift) || null); },
  async listAssessments(from, to) { return clone(load().assessments.filter((a) => a.date >= from && a.date <= to)); },
  async saveAssessment(a) {
    const db = load(); const row = Object.assign({}, a, { updated_at: nowISO() });
    const i = db.assessments.findIndex((x) => (a.id && x.id === a.id) || (x.patient_id === a.patient_id && x.date === a.date && x.shift === a.shift));
    if (i >= 0) { row.id = db.assessments[i].id; db.assessments[i] = Object.assign(db.assessments[i], row); } else { row.id = row.id || uid(); db.assessments.push(row); }
    save(db); return clone(i >= 0 ? db.assessments[i] : row);
  },
  async resetDemo() { ls.removeItem(KEY); }
};

/* ------------------------------------------------------------------ */
/* Supabase store                                                       */
/* ------------------------------------------------------------------ */
let sbPromise = null;
function sb() {
  if (!sbPromise) {
    sbPromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm').then(({ createClient }) => createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true } }));
  }
  return sbPromise;
}
function check({ data, error }) { if (error) throw new Error(error.message); return data; }

const supa = {
  mode: 'supabase',
  async session() {
    const c = await sb(); const { data } = await c.auth.getSession();
    const u = data && data.session && data.session.user; if (!u) return null;
    const prof = await c.from('profiles').select('*').eq('id', u.id).maybeSingle();
    const p = prof.data || {};
    return { id: u.id, username: p.username || u.email.split('@')[0], name: p.display_name || p.username || u.email.split('@')[0], role: p.role || 'nurse' };
  },
  async signIn(username, password) {
    const c = await sb(); const name = String(username || '').trim().toLowerCase();
    const email = name.includes('@') ? name : name + '@' + USERNAME_DOMAIN;
    const { error } = await c.auth.signInWithPassword({ email, password });
    if (error) throw new Error('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
    return this.session();
  },
  async signOut() { const c = await sb(); await c.auth.signOut(); },
  async listProfiles() { const c = await sb(); return check(await c.from('profiles').select('id, username, display_name, role')).map((p) => ({ id: p.id, username: p.username, name: p.display_name || p.username, role: p.role })); },
  async listPatients(status) { const c = await sb(); let q = c.from('patients').select('*').order('bed'); if (status) q = q.eq('status', status); return check(await q); },
  async getPatient(id) { const c = await sb(); return check(await c.from('patients').select('*').eq('id', id).maybeSingle()); },
  async addPatient(p, devices, by) {
    const c = await sb(); const np = check(await c.from('patients').insert(Object.assign({ status: 'active', baseline: { _meta: {} } }, p)).select().single());
    for (const d of devices || []) await this.addDevice(np.id, d, by, 'บันทึกตอนรับผู้ป่วย');
    return np;
  },
  async updatePatient(id, patch) { const c = await sb(); return check(await c.from('patients').update(patch).eq('id', id).select().single()); },
  async listDevices(pid) {
    const c = await sb(); const rows = check(await c.from('devices').select('*, device_events(*)').eq('patient_id', pid).order('created_at'));
    return rows.map((d) => Object.assign({}, d, { events: (d.device_events || []).sort((a, b) => b.created_at.localeCompare(a.created_at)) }));
  },
  async listActiveDevices() {
    const c = await sb(); const rows = check(await c.from('devices').select('*, patients!inner(code, bed, status)').is('removed_at', null).eq('patients.status', 'active'));
    return rows.map((d) => Object.assign({}, d, { patient: { code: d.patients.code, bed: d.patients.bed } }));
  },
  async addDevice(pid, d, by, note) {
    const c = await sb(); const nd = check(await c.from('devices').insert(Object.assign({ patient_id: pid }, d)).select().single());
    check(await c.from('device_events').insert({ device_id: nd.id, action: 'add', detail: note || 'เพิ่มอุปกรณ์', by_name: by }));
    return nd;
  },
  async updateDevice(id, patch, action, detail, by) {
    const c = await sb(); const d = check(await c.from('devices').update(patch).eq('id', id).select().single());
    check(await c.from('device_events').insert({ device_id: id, action, detail, by_name: by }));
    return d;
  },
  async getAssessment(id) { const c = await sb(); return check(await c.from('assessments').select('*').eq('id', id).maybeSingle()); },
  async findAssessment(pid, date, shift) { const c = await sb(); return check(await c.from('assessments').select('*').eq('patient_id', pid).eq('date', date).eq('shift', shift).maybeSingle()); },
  async listAssessments(from, to) { const c = await sb(); return check(await c.from('assessments').select('*').gte('date', from).lte('date', to)); },
  async saveAssessment(a) {
    const c = await sb(); const row = Object.assign({}, a, { updated_at: nowISO() }); delete row.id;
    return check(await c.from('assessments').upsert(row, { onConflict: 'patient_id,date,shift' }).select().single());
  },
  async resetDemo() {}
};

export const store = useSupabase ? supa : demo;
