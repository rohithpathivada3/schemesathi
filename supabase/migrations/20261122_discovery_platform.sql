create table if not exists public.ss_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sector text not null check (sector in ('government', 'private')),
  website_url text not null,
  official_domain text not null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ss_organizations_domain_idx
  on public.ss_organizations (lower(official_domain));

create table if not exists public.ss_scheme_categories (
  id text primary key,
  name text not null,
  name_te text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.ss_scheme_categories (id, name) values
  ('education-scholarships', 'Education & Scholarships'),
  ('jobs-employment', 'Jobs & Employment'),
  ('agriculture-farmers', 'Agriculture & Farmers'),
  ('health-medical', 'Health & Medical Assistance'),
  ('business-entrepreneurship', 'Business & Entrepreneurship'),
  ('women-child-welfare', 'Women & Child Welfare'),
  ('social-welfare-pension', 'Social Welfare & Pension'),
  ('housing-basic-needs', 'Housing & Basic Needs'),
  ('technology-innovation', 'Technology & Innovation'),
  ('research-development', 'Research & Development'),
  ('skill-development-training', 'Skill Development & Training'),
  ('other-benefits', 'Other Government & Private Benefits')
on conflict (id) do nothing;

create table if not exists public.ss_information_sources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.ss_organizations(id) on delete restrict,
  name text not null,
  source_url text not null unique,
  source_type text not null check (source_type in ('api', 'rss', 'manual')),
  authorized_domain text not null,
  domain_ids text[] not null default '{}',
  parser_config jsonb not null default '{}'::jsonb,
  api_key_env_var text
    check (api_key_env_var is null or api_key_env_var ~ '^SOURCE_API_KEY_[A-Z0-9_]+$'),
  api_key_header text not null default 'x-api-key',
  trust_status text not null default 'pending'
    check (trust_status in ('pending', 'verified', 'rejected')),
  is_enabled boolean not null default false,
  refresh_interval_minutes integer not null default 1440
    check (refresh_interval_minutes >= 15),
  max_requests_per_hour integer not null default 4
    check (max_requests_per_hour > 0),
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_http_status integer,
  etag text,
  last_modified text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ss_schemes (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.ss_information_sources(id) on delete restrict,
  organization_id uuid not null references public.ss_organizations(id) on delete restrict,
  source_identifier text,
  dedupe_key text not null unique,
  title text not null,
  sector text not null check (sector in ('government', 'private')),
  government_level text,
  state text,
  description text not null,
  benefits jsonb not null default '[]'::jsonb,
  eligibility jsonb not null default '[]'::jsonb,
  required_documents jsonb not null default '[]'::jsonb,
  application_url text,
  source_url text not null,
  source_published_at date,
  application_start_date date,
  application_deadline date,
  application_status text not null default 'verification_required'
    check (application_status in (
      'new', 'active', 'upcoming', 'closing_soon', 'closed', 'verification_required'
    )),
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'conflict', 'rejected')),
  last_verified_at timestamptz,
  is_published boolean not null default false,
  check (not is_published or (
    verification_status = 'verified' and last_verified_at is not null
  )),
  first_seen_at timestamptz not null default now(),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ss_schemes_source_identifier_idx
  on public.ss_schemes (source_id, source_identifier)
  where source_identifier is not null;
create index if not exists ss_schemes_public_status_idx
  on public.ss_schemes (application_status, application_deadline)
  where is_published and verification_status = 'verified';
create index if not exists ss_schemes_search_idx
  on public.ss_schemes using gin (
    to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(description, ''))
  );

create table if not exists public.ss_scheme_category_links (
  scheme_id uuid not null references public.ss_schemes(id) on delete restrict,
  category_id text not null references public.ss_scheme_categories(id) on delete restrict,
  primary key (scheme_id, category_id)
);
create index if not exists ss_scheme_category_links_category_idx
  on public.ss_scheme_category_links (category_id, scheme_id);

create table if not exists public.ss_scheme_updates (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.ss_schemes(id) on delete restrict,
  source_id uuid not null references public.ss_information_sources(id) on delete restrict,
  source_url text not null,
  source_published_at date,
  observed_at timestamptz not null default now(),
  changed_fields text[] not null default '{}',
  previous_data jsonb not null,
  observed_data jsonb not null,
  review_status text not null default 'pending'
    check (review_status in ('pending', 'approved', 'rejected', 'conflict'))
);
create index if not exists ss_scheme_updates_history_idx
  on public.ss_scheme_updates (scheme_id, observed_at desc);

create table if not exists public.ss_synchronization_logs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.ss_information_sources(id) on delete restrict,
  status text not null check (status in ('running', 'succeeded', 'partial', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  records_seen integer not null default 0 check (records_seen >= 0),
  records_created integer not null default 0 check (records_created >= 0),
  records_updated integer not null default 0 check (records_updated >= 0),
  records_reviewed integer not null default 0 check (records_reviewed >= 0),
  records_duplicated integer not null default 0 check (records_duplicated >= 0),
  records_rejected integer not null default 0 check (records_rejected >= 0),
  error_code text,
  error_summary text
);
create index if not exists ss_synchronization_logs_recent_idx
  on public.ss_synchronization_logs (started_at desc);

create table if not exists public.ss_administrator_reviews (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid not null references public.ss_schemes(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  reviewer_reference text,
  notes text not null default '',
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ss_administrator_reviews_queue_idx
  on public.ss_administrator_reviews (status, created_at);

create table if not exists public.ss_notifications (
  id uuid primary key default gen_random_uuid(),
  scheme_id uuid references public.ss_schemes(id) on delete restrict,
  category_id text references public.ss_scheme_categories(id) on delete restrict,
  event_type text not null check (event_type in (
    'new_scheme', 'scheme_updated', 'deadline_changed', 'application_opened',
    'closing_soon', 'verification_changed'
  )),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
create index if not exists ss_notifications_recent_idx
  on public.ss_notifications (created_at desc);

alter table public.ss_organizations enable row level security;
alter table public.ss_scheme_categories enable row level security;
alter table public.ss_information_sources enable row level security;
alter table public.ss_schemes enable row level security;
alter table public.ss_scheme_category_links enable row level security;
alter table public.ss_scheme_updates enable row level security;
alter table public.ss_synchronization_logs enable row level security;
alter table public.ss_administrator_reviews enable row level security;
alter table public.ss_notifications enable row level security;

revoke all on table
  public.ss_organizations,
  public.ss_scheme_categories,
  public.ss_information_sources,
  public.ss_schemes,
  public.ss_scheme_category_links,
  public.ss_scheme_updates,
  public.ss_synchronization_logs,
  public.ss_administrator_reviews,
  public.ss_notifications
from anon, authenticated;

grant all on table
  public.ss_organizations,
  public.ss_scheme_categories,
  public.ss_information_sources,
  public.ss_schemes,
  public.ss_scheme_category_links,
  public.ss_scheme_updates,
  public.ss_synchronization_logs,
  public.ss_administrator_reviews,
  public.ss_notifications
to service_role;
