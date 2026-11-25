alter table saved_accounts add column if not exists fields jsonb not null default '[]'::jsonb;
