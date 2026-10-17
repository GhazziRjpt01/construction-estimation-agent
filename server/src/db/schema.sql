-- Catalog, saved estimates, and plan-upload records for Supabase Postgres.
-- Column names follow server/src/db/loader.js and server/src/db/estimates.js.
-- create table if not exists does not add columns to a table that already exists.
-- Run this file on a fresh database, then server/src/db/seed.sql.

create table if not exists regions (
  id text primary key,
  country text not null,
  currency text not null,
  unit_system text not null check (unit_system in ('imperial', 'metric')),
  tax_label text not null,
  default_sales_tax numeric not null,
  default_labor_burden numeric not null,
  default_overhead_profit numeric not null,
  default_contingency numeric not null
);

create table if not exists materials (
  id text primary key,
  code text not null unique,
  name text not null,
  unit text not null,
  category text not null,
  csi_division text not null
);

create table if not exists material_prices (
  material_id text not null references materials (id),
  region_code text not null references regions (id),
  unit_cost numeric not null,
  is_placeholder boolean not null default true,
  notes text,
  updated_at date not null default current_date,
  primary key (material_id, region_code)
);

create table if not exists labor_rates (
  trade text not null,
  region_code text not null references regions (id),
  hourly_rate numeric not null,
  is_placeholder boolean not null default true,
  notes text,
  updated_at date not null default current_date,
  primary key (trade, region_code)
);

create table if not exists assemblies (
  id text primary key,
  code text not null unique,
  name text not null,
  description text,
  output_unit text not null,
  csi_division text not null
);

create table if not exists assembly_items (
  id bigint generated always as identity primary key,
  assembly_id text not null references assemblies (id),
  material_id text references materials (id),
  trade text,
  quantity_per_unit numeric not null check (quantity_per_unit > 0),
  unit text not null,
  waste numeric not null default 0.05 check (waste >= 0),
  labor_hours_per_unit numeric not null default 0 check (labor_hours_per_unit >= 0),
  notes text,
  check (
    (material_id is not null and trade is null)
    or (material_id is null and trade is not null)
  )
);

create table if not exists location_factors (
  region_code text primary key references regions (id),
  name text not null,
  material_factor numeric not null default 1.0,
  labor_factor numeric not null default 1.0,
  is_placeholder boolean not null default true,
  notes text
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  inputs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists estimates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects (id) on delete cascade,
  result jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists uploads (
  id uuid primary key default gen_random_uuid(),
  session_id text,
  storage_path text,
  mime_type text,
  size_bytes integer,
  created_at timestamptz not null default now()
);

create index if not exists material_prices_region_code_idx
  on material_prices (region_code);

create index if not exists labor_rates_region_code_idx
  on labor_rates (region_code);

create index if not exists assembly_items_assembly_id_idx
  on assembly_items (assembly_id);

create index if not exists assembly_items_material_id_idx
  on assembly_items (material_id);

create unique index if not exists assembly_items_material_key
  on assembly_items (assembly_id, material_id)
  where material_id is not null;

create unique index if not exists assembly_items_labor_key
  on assembly_items (assembly_id, trade)
  where trade is not null;

create index if not exists estimates_project_id_idx
  on estimates (project_id);

create index if not exists uploads_session_id_idx
  on uploads (session_id);

create index if not exists uploads_created_at_idx
  on uploads (created_at);

alter table regions enable row level security;
alter table materials enable row level security;
alter table material_prices enable row level security;
alter table labor_rates enable row level security;
alter table assemblies enable row level security;
alter table assembly_items enable row level security;
alter table location_factors enable row level security;
alter table projects enable row level security;
alter table estimates enable row level security;
alter table uploads enable row level security;

grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
