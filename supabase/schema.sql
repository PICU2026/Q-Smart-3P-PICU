-- Q-Smart 3P PICU · ฐานข้อมูล Supabase
-- วิธีใช้: Supabase › SQL Editor › New query › วางทั้งไฟล์ › Run (รันครั้งเดียว)

-- 1) โปรไฟล์ผู้ใช้ (สร้างอัตโนมัติเมื่อเพิ่มผู้ใช้ใน Authentication)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  display_name text,
  role text not null default 'nurse' check (role in ('nurse', 'head', 'admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, split_part(new.email, '@', 1),
          coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2) ผู้ป่วย (baseline = ข้อมูลตั้งต้นที่ล็อกไว้ให้ทุกเวร เช่น Pt. Band, เบอร์ท่อ ETT)
create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  bed text not null,
  status text not null default 'active' check (status in ('active', 'discharged')),
  admitted_at timestamptz not null default now(),
  discharged_at timestamptz,
  discharge_reason text,
  baseline jsonb not null default '{"_meta": {}}'::jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
-- หนึ่งเตียงมีผู้ป่วยที่กำลังรักษาได้คนเดียว
create unique index if not exists patients_active_bed on public.patients (bed) where status = 'active';

-- 3) อุปกรณ์ + ประวัติการเปลี่ยน
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  type text not null,
  start_date date not null,
  exp_date date,
  no_exp boolean not null default false,
  removed_at date,
  remove_reason text,
  created_at timestamptz not null default now()
);
create index if not exists devices_patient on public.devices (patient_id);

create table if not exists public.device_events (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.devices (id) on delete cascade,
  action text not null,
  detail text,
  by_name text,
  by_user uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists device_events_device on public.device_events (device_id);

-- 4) แบบประเมิน (1 แถว ต่อ ผู้ป่วย × วัน × เวร) · results เก็บผลรายข้อ {"g1_1": {"s":"p","by":"Nurse001"}, ...}
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients (id) on delete cascade,
  date date not null,
  shift text not null check (shift in ('ด', 'ช', 'บ')),
  mode int not null default 1 check (mode in (1, 2)),
  part1_by text,
  part2_by text,
  results jsonb not null default '{}'::jsonb,
  submitted boolean not null default false,
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  unique (patient_id, date, shift)
);
create index if not exists assessments_date on public.assessments (date);

-- 5) ความปลอดภัย: เฉพาะผู้ที่เข้าสู่ระบบแล้วเท่านั้นที่อ่าน/เขียนได้
alter table public.profiles enable row level security;
alter table public.patients enable row level security;
alter table public.devices enable row level security;
alter table public.device_events enable row level security;
alter table public.assessments enable row level security;

drop policy if exists "staff read profiles" on public.profiles;
create policy "staff read profiles" on public.profiles for select to authenticated using (true);
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists "staff all patients" on public.patients;
create policy "staff all patients" on public.patients for all to authenticated using (true) with check (true);
drop policy if exists "staff all devices" on public.devices;
create policy "staff all devices" on public.devices for all to authenticated using (true) with check (true);
drop policy if exists "staff all device_events" on public.device_events;
create policy "staff all device_events" on public.device_events for all to authenticated using (true) with check (true);
drop policy if exists "staff all assessments" on public.assessments;
create policy "staff all assessments" on public.assessments for all to authenticated using (true) with check (true);
