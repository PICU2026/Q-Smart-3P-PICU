# Q-Smart 3P PICU — ระบบตรวจสอบความเสี่ยงขณะรับส่งเวร

เว็บแอปสำหรับพยาบาล PICU ใช้บนมือถือและคอมพิวเตอร์ ประกอบด้วย:
เข้าสู่ระบบ · หน้าหลัก · เริ่มประเมิน (4 ขั้น) · แบบประเมิน 9 Goal (1 ท่าน / 2 ท่าน) · ผลรายเตียง ·
อุปกรณ์และวัน Exp · แจ้งเตือนล่วงหน้า 1 วัน · รายงาน + Export Excel 2 แบบ · Dashboard KPI · จัดการผู้ป่วย

ใช้บริการฟรี 3 ตัว:

| บริการ | ทำหน้าที่ |
|---|---|
| **GitHub** | เก็บไฟล์โปรแกรม |
| **Supabase** | ฐานข้อมูล + ระบบชื่อผู้ใช้/รหัสผ่าน |
| **Netlify หรือ Vercel** | เปิดเว็บให้ใช้งานจริง (ได้ลิงก์ เช่น `picu-xxx.vercel.app`) |

> ⚠️ ตอนนี้เป็น **ช่วงทดลอง** ให้ใช้รหัสผู้ป่วย (เช่น P012) เท่านั้น ห้ามใส่ชื่อ-นามสกุลหรือ HN จริง
> ก่อนใช้กับข้อมูลผู้ป่วยจริง ต้องขออนุญาตฝ่าย IT / ผู้รับผิดชอบข้อมูลส่วนบุคคล (PDPA) ของโรงพยาบาลก่อน

---

## ขั้นที่ 0 · ลองเล่นได้เลย (ยังไม่ต้องตั้งค่าอะไร)

ถ้ายังไม่ได้ใส่ค่า Supabase ระบบจะเปิดเป็น **โหมดทดลอง** อัตโนมัติ (มีแถบสีเหลืองด้านบน)
ข้อมูลเก็บในเครื่องนั้นเครื่องเดียว · เข้าด้วย `nurse001` / `1234` (หรือ `nurse002`, `head`)

---

## ขั้นที่ 1 · GitHub (เก็บไฟล์)

1. สมัครที่ https://github.com/signup
2. กด **+** มุมขวาบน › **New repository**
   - Repository name: `picu-risk-check`
   - เลือก **Private** › กด **Create repository**
3. ในหน้า repo ที่ว่าง กดลิงก์ **uploading an existing file**
4. แตกไฟล์ zip ที่ได้รับ แล้ว **ลากไฟล์และโฟลเดอร์ทั้งหมดข้างใน** (index.html, styles.css, js, supabase, …) มาวาง
5. กด **Commit changes**

## ขั้นที่ 2 · Supabase (ฐานข้อมูล + ล็อกอิน)

1. สมัครที่ https://supabase.com (กด **Continue with GitHub** ได้เลย)
2. **New project**
   - Name: `picu-risk-check`
   - Database Password: ตั้งรหัสยาว ๆ แล้ว **จดเก็บไว้**
   - Region: **Southeast Asia (Singapore)**
   - รอสร้างเสร็จ ~2 นาที
3. เมนูซ้าย **SQL Editor** › **New query** › เปิดไฟล์ `supabase/schema.sql` คัดลอกทั้งหมดมาวาง › กด **Run**
   (ถ้าอยากได้ข้อมูลทดลอง 11 เตียง ให้ทำซ้ำกับไฟล์ `supabase/seed_test_data.sql`)
4. **ปิดการสมัครเอง** (กันคนนอกสมัครเข้ามา):
   **Authentication** › **Sign In / Providers** › ปิด **Allow new users to sign up** และปิด **Confirm email** › Save
5. **สร้างบัญชีพยาบาล** (ทำทีละคน):
   **Authentication** › **Users** › **Add user** › **Create new user**
   - Email: `nurse001@picu.local` ← ส่วนหน้า @ คือ "ชื่อผู้ใช้" ที่พิมพ์ตอนล็อกอิน
   - Password: ตั้งให้แต่ละคน
   - ติ๊ก **Auto Confirm User** › Create user
6. (ไม่บังคับ) ตั้งชื่อที่แสดงและสิทธิ์: **Table Editor** › ตาราง `profiles` › แก้ช่อง `display_name` (เช่น "พว.สมใจ")
   และช่อง `role` ของหัวหน้าหอเป็น `head`
7. **คัดลอกกุญแจ 2 ค่า**: **Project Settings** › **API** (หรือ Data API)
   - **Project URL** (เช่น `https://abcd1234.supabase.co`)
   - **anon public** key (ข้อความยาว ๆ ขึ้นต้นด้วย `eyJ…`)
   > ห้ามใช้ `service_role` key เด็ดขาด

## ขั้นที่ 3 · ใส่กุญแจลงในโปรแกรม

1. กลับไปที่ repo บน GitHub › เปิดไฟล์ `js/config.js` › กดรูป ✏️ (Edit)
2. ใส่ค่าที่คัดลอกมา:
   ```js
   export const SUPABASE_URL = 'https://abcd1234.supabase.co';
   export const SUPABASE_ANON_KEY = 'eyJ...';
   ```
3. กด **Commit changes**

> anon key เปิดเผยได้ ระบบป้องกันด้วยกฎ Row Level Security ในฐานข้อมูล (เฉพาะคนที่ล็อกอินแล้วเท่านั้นที่อ่าน/เขียนข้อมูลได้)

## ขั้นที่ 4 · Netlify (เปิดเว็บจริง)

1. สมัครที่ https://app.netlify.com/signup › **Sign up with GitHub**
2. **Add new site** (หรือ Add new project) › **Import an existing project** › **GitHub** › อนุญาตให้เข้าถึง repo `picu-risk-check`
3. ตั้งค่า build:
   - Build command: **เว้นว่าง**
   - Publish directory: **`.`** (จุดเดียว)
   - กด **Deploy**
4. ได้ลิงก์ เช่น `https://random-name-123.netlify.app` · เปลี่ยนชื่อได้ที่ **Site configuration › Change site name** (เช่น `qsmart-picu`)
5. เปิดลิงก์บนมือถือ › ล็อกอินด้วย `nurse001` และรหัสที่ตั้งในขั้นที่ 2
   - เพิ่มเป็นไอคอนบนหน้าจอ: Safari › แชร์ › **Add to Home Screen** / Chrome › ⋮ › **Add to Home screen**

## ขั้นที่ 4 (แบบ Vercel) · เปิดเว็บจริง

1. สมัครที่ https://vercel.com/signup › **Continue with GitHub**
2. **Add New… › Project** › เลือก repo `picu-risk-check` › **Import**
3. ตั้งค่า:
   - Framework Preset: **Other**
   - Build Command: **เว้นว่าง** (หรือเปิดสวิตช์ Override แล้วเว้นว่าง)
   - Output Directory: **`.`**
   - กด **Deploy**
4. ได้ลิงก์ เช่น `https://picu-risk-check.vercel.app` (ลิงก์หลักนี้เปิดได้ทุกคน ส่วนลิงก์ยาว ๆ ที่มีรหัสต่อท้ายจะต้องล็อกอิน Vercel)
5. แก้ไฟล์บน GitHub แล้ว Commit → Vercel อัปเดตเว็บให้อัตโนมัติ

## แก้ไขโปรแกรมภายหลัง

แก้ไฟล์บน GitHub แล้ว Commit → Netlify อัปเดตเว็บให้อัตโนมัติภายใน ~1 นาที

---

## ข้อควรรู้

- **Supabase แผนฟรี** จะพักโปรเจกต์อัตโนมัติถ้าไม่มีการใช้งาน 7 วัน (กด Restore ได้) ใช้ทุกวันจะไม่โดนพัก
- **สำรองข้อมูล**: ใช้ปุ่ม Export ในหน้ารายงานเป็นประจำ หรืออัปเกรดแผน Supabase เพื่อได้ backup อัตโนมัติ
- **ลืมรหัสผ่าน**: ผู้ดูแลตั้งรหัสใหม่ให้ได้ที่ Authentication › Users › เลือกผู้ใช้ › Reset/Update password
- **รายการตรวจ 36 ข้อ (9 Goal)** อยู่ในไฟล์ `js/goals.js` · อายุอุปกรณ์ (เช่น Circuit 14 วัน) อยู่ส่วน `DEV_TYPES` ในไฟล์เดียวกัน
- **เวร**: ดึก 00:00–07:59 · เช้า 08:00–15:59 · บ่าย 16:00–23:59 (ระบบเลือกเวรปัจจุบันให้อัตโนมัติ)

## โครงสร้างไฟล์

```
index.html, styles.css, favicon.svg   หน้าเว็บและธีม
js/config.js                          กุญแจ Supabase
js/goals.js                           รายการตรวจ 9 Goal + ชนิดอุปกรณ์
js/store.js                           เชื่อมฐานข้อมูล (Supabase / โหมดทดลอง)
js/screens/*.js                       หน้าจอแต่ละหน้า
supabase/schema.sql                   สร้างตาราง + กฎความปลอดภัย
supabase/seed_test_data.sql           ข้อมูลทดลอง (ไม่บังคับ)
netlify.toml / vercel.json           ตั้งค่า Netlify / Vercel
```
