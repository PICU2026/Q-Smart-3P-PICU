-- (ไม่บังคับ) ข้อมูลทดลอง 11 เตียง สำหรับลองใช้ระบบ · รันหลัง schema.sql
-- ลบทิ้งได้ภายหลังด้วย:  delete from public.patients where code like 'T%';
insert into public.patients (code, bed, baseline)
select 'T' || lpad(n::text, 3, '0'), lpad(n::text, 2, '0'),
       '{"band1":"ข้อมือซ้าย","band2":"ข้อเท้าขวา","allergy":"หัวเตียง","ettNo":"4.5","ettCm":"13","blow":"2","cuff":"20","cxr":"1.5","_meta":{}}'::jsonb
from generate_series(1, 11) as n
on conflict do nothing;

insert into public.devices (patient_id, type, start_date, exp_date)
select id, 'circuit', current_date - 3, current_date + 11 from public.patients where code like 'T%';
insert into public.devices (patient_id, type, start_date, exp_date)
select id, 'filter', current_date - 1, current_date + 1 from public.patients where code in ('T002', 'T007');
insert into public.devices (patient_id, type, start_date, exp_date)
select id, 'ng', current_date - 6, current_date + 1 from public.patients where code = 'T004';
