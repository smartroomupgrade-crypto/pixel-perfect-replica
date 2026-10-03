
create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  name text not null,
  description text,
  location text,
  timezone text not null default 'Africa/Kampala',
  demo_mode boolean not null default false,
  setup_step int not null default 1,
  setup_complete boolean not null default false,
  thingspeak_enabled boolean not null default false,
  thingspeak_channel_id text,
  thingspeak_interval_sec int not null default 20,
  gateway_name text,
  gateway_url text,
  gateway_endpoint text,
  gateway_status text not null default 'unknown',
  gateway_checked_at timestamptz,
  telegram_enabled boolean not null default false,
  telegram_chat_id text,
  camera_enabled boolean not null default false,
  camera_name text,
  camera_endpoint text,
  camera_upload_endpoint text,
  offline_timeout_sec int not null default 120,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;
create policy "own projects" on public.projects for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create trigger projects_updated before update on public.projects for each row execute function public.set_updated_at();

create or replace function public.owns_project(_project uuid) returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.projects where id = _project and user_id = auth.uid());
$$;

-- secrets: write-only from client, never readable
create table public.project_credentials (
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null,
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (project_id, kind)
);
grant insert, update, delete on public.project_credentials to authenticated;
grant all on public.project_credentials to service_role;
alter table public.project_credentials enable row level security;
create policy "insert own creds" on public.project_credentials for insert to authenticated with check (public.owns_project(project_id));
create policy "update own creds" on public.project_credentials for update to authenticated using (public.owns_project(project_id)) with check (public.owns_project(project_id));
create policy "delete own creds" on public.project_credentials for delete to authenticated using (public.owns_project(project_id));

create table public.sensors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  sensor_type text not null default 'Custom',
  sensor_key text not null,
  arduino_pin text,
  data_field text,
  thingspeak_field int,
  unit text,
  min_value numeric,
  max_value numeric,
  warning_threshold numeric,
  critical_threshold numeric,
  value_kind text not null default 'numeric',
  decimals int not null default 1,
  enabled boolean not null default true,
  show_on_monitoring boolean not null default true,
  include_in_analytics boolean not null default true,
  alerts_enabled boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.sensors to authenticated;
grant all on public.sensors to service_role;
alter table public.sensors enable row level security;
create policy "own sensors" on public.sensors for all to authenticated using (public.owns_project(project_id)) with check (public.owns_project(project_id));

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  device_type text not null default 'custom',
  device_key text not null,
  arduino_pin text,
  room text,
  control_type text not null default 'onoff',
  command_on text,
  command_off text,
  feedback_field text,
  icon text,
  enabled boolean not null default true,
  state text not null default 'off',
  status text not null default 'offline',
  value numeric,
  last_confirmed_at timestamptz,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.devices to authenticated;
grant all on public.devices to service_role;
alter table public.devices enable row level security;
create policy "own devices" on public.devices for all to authenticated using (public.owns_project(project_id)) with check (public.owns_project(project_id));

create table public.device_commands (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  device_id uuid references public.devices(id) on delete set null,
  device_name text not null,
  command text not null,
  user_email text,
  status text not null default 'sent',
  reason text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
grant select, insert, update, delete on public.device_commands to authenticated;
grant all on public.device_commands to service_role;
alter table public.device_commands enable row level security;
create policy "own commands" on public.device_commands for all to authenticated using (public.owns_project(project_id)) with check (public.owns_project(project_id));

create table public.automations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  sensor_id uuid references public.sensors(id) on delete cascade,
  operator text not null default '>',
  threshold numeric,
  action text not null default 'device_on',
  device_id uuid references public.devices(id) on delete cascade,
  enabled boolean not null default true,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.automations to authenticated;
grant all on public.automations to service_role;
alter table public.automations enable row level security;
create policy "own automations" on public.automations for all to authenticated using (public.owns_project(project_id)) with check (public.owns_project(project_id));

create table public.events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  kind text not null,
  severity text not null default 'info',
  title text not null,
  detail text,
  sensor_id uuid references public.sensors(id) on delete set null,
  value numeric,
  acknowledged boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.events to authenticated;
grant all on public.events to service_role;
alter table public.events enable row level security;
create policy "own events" on public.events for all to authenticated using (public.owns_project(project_id)) with check (public.owns_project(project_id));

create table public.camera_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  image_url text,
  note text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.camera_images to authenticated;
grant all on public.camera_images to service_role;
alter table public.camera_images enable row level security;
create policy "own images" on public.camera_images for all to authenticated using (public.owns_project(project_id)) with check (public.owns_project(project_id));

alter publication supabase_realtime add table public.devices;
alter publication supabase_realtime add table public.device_commands;
