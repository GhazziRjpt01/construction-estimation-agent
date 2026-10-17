-- Add rate timestamps for databases created before updated_at existed.
-- Fresh installs already have the columns from schema.sql.

alter table material_prices
  add column if not exists updated_at timestamptz not null default now();

alter table labor_rates
  add column if not exists updated_at timestamptz not null default now();
