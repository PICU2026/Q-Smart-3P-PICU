// Runs on Vercel/Netlify at build time: copies Supabase settings from environment variables into js/config.js.
// Works with the Vercel ↔ Supabase integration (SUPABASE_URL / NEXT_PUBLIC_SUPABASE_*), or variables you add yourself.
import { writeFileSync, readFileSync } from 'node:fs';

const env = process.env;
const pick = (...names) => names.map((n) => env[n]).find((v) => v && v.trim());
const url = pick('SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL', 'VITE_SUPABASE_URL');
const key = pick('SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEY', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY');

if (!url || !key) {
  console.log('[config] ไม่พบค่า Supabase ใน Environment Variables → ใช้ค่าใน js/config.js ตามเดิม');
  process.exit(0);
}
// Never ship a secret key to the browser
let role = '';
if (key.startsWith('eyJ')) { try { role = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role; } catch (e) { /* ignore */ } }
if (role === 'service_role' || key.startsWith('sb_secret_')) {
  console.error('[config] หยุด: คีย์ที่ได้เป็นคีย์ลับ (service_role/secret) ห้ามใส่ในหน้าเว็บ ให้ใช้ anon / publishable key');
  process.exit(1);
}
const path = new URL('../js/config.js', import.meta.url);
const old = readFileSync(path, 'utf8');
const next = old
  .replace(/export const SUPABASE_URL = '.*?';/, `export const SUPABASE_URL = ${JSON.stringify(url.trim())};`)
  .replace(/export const SUPABASE_ANON_KEY = '.*?';/, `export const SUPABASE_ANON_KEY = ${JSON.stringify(key.trim())};`);
writeFileSync(path, next);
console.log('[config] ใส่ค่า Supabase จาก Environment Variables แล้ว:', url.trim());
