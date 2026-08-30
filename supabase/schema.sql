-- ThinkTrace AI — database schema
-- Run this in the Supabase SQL editor (or `supabase db push`) before using
-- connected mode. Demo mode needs none of this.

create extension if not exists "pgcrypto";

/* ---------------------------------------------------------------- */
/* Profiles                                                          */
/* ---------------------------------------------------------------- */
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text not null default '',
  role        text not null default 'student' check (role in ('teacher','student')),
  created_at  timestamptz not null default now()
);

-- Create a profile automatically on sign-up, carrying the role and name
-- supplied in the sign-up metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/* ---------------------------------------------------------------- */
/* Classroom sessions                                                */
/* ---------------------------------------------------------------- */
create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  topic       text not null default '',
  join_code   text not null unique,
  status      text not null default 'lobby' check (status in ('lobby','live','ended')),
  created_at  timestamptz not null default now()
);
create index if not exists sessions_teacher_idx on public.sessions(teacher_id);
create index if not exists sessions_join_code_idx on public.sessions(join_code);

create table if not exists public.participants (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete set null,
  display_name  text not null,
  is_anonymous  boolean not null default false,
  joined_at     timestamptz not null default now(),
  unique (session_id, user_id)
);
create index if not exists participants_session_idx on public.participants(session_id);

/* ---------------------------------------------------------------- */
/* Questions and responses                                           */
/* ---------------------------------------------------------------- */
create table if not exists public.questions (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.sessions(id) on delete cascade,
  prompt            text not null,
  type              text not null default 'mcq' check (type in ('mcq','open')),
  options           jsonb not null default '[]'::jsonb,
  correct_option_id text,
  concept           text not null default '',
  status            text not null default 'draft' check (status in ('draft','published','closed')),
  allow_anonymous   boolean not null default false,
  created_at        timestamptz not null default now(),
  published_at      timestamptz
);
create index if not exists questions_session_idx on public.questions(session_id);

create table if not exists public.responses (
  id                 uuid primary key default gen_random_uuid(),
  question_id        uuid not null references public.questions(id) on delete cascade,
  session_id         uuid not null references public.sessions(id) on delete cascade,
  participant_id     uuid not null references public.participants(id) on delete cascade,
  selected_option_id text,
  answer_text        text,
  reasoning          text not null default '',
  is_correct         boolean,
  created_at         timestamptz not null default now(),
  unique (question_id, participant_id)
);
create index if not exists responses_session_idx on public.responses(session_id);
create index if not exists responses_question_idx on public.responses(question_id);

/* ---------------------------------------------------------------- */
/* AI analysis artefacts                                             */
/* ---------------------------------------------------------------- */
create table if not exists public.confusion_maps (
  question_id uuid primary key references public.questions(id) on delete cascade,
  session_id  uuid not null references public.sessions(id) on delete cascade,
  payload     jsonb not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.diagnoses (
  id             uuid primary key default gen_random_uuid(),
  response_id    uuid references public.responses(id) on delete set null,
  participant_id uuid not null references public.participants(id) on delete cascade,
  session_id     uuid references public.sessions(id) on delete set null,
  payload        jsonb not null,
  created_at     timestamptz not null default now()
);
create index if not exists diagnoses_participant_idx on public.diagnoses(participant_id);

-- One diagnosis per response. This has to be a plain constraint, not a
-- partial unique index: the app upserts with ON CONFLICT (response_id), and
-- Postgres will not use a partial index as a conflict arbiter unless the
-- statement repeats its WHERE clause, which PostgREST cannot emit. A plain
-- UNIQUE is equivalent here anyway — Postgres treats NULLs as distinct, so
-- self-study diagnoses (response_id null) can still have many rows.
do $$ begin
  if exists (
    select 1 from pg_class where relname = 'diagnoses_response_idx'
      and relkind = 'i'
      and not exists (
        select 1 from pg_constraint where conname = 'diagnoses_response_idx'
      )
  ) then
    drop index if exists public.diagnoses_response_idx;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.diagnoses'::regclass
      and conname = 'diagnoses_response_key'
  ) then
    alter table public.diagnoses
      add constraint diagnoses_response_key unique (response_id);
  end if;
end $$;

create table if not exists public.practice_attempts (
  id                    uuid primary key default gen_random_uuid(),
  diagnosis_id          uuid not null references public.diagnoses(id) on delete cascade,
  question_id           text not null,
  selected_option_id    text not null,
  is_correct            boolean not null,
  repeated_misconception boolean not null default false,
  created_at            timestamptz not null default now(),
  unique (diagnosis_id, question_id)
);

create table if not exists public.teach_backs (
  id             uuid primary key default gen_random_uuid(),
  diagnosis_id   uuid not null references public.diagnoses(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  prompt         text not null default '',
  text           text not null,
  evaluation     jsonb not null,
  created_at     timestamptz not null default now()
);
create index if not exists teach_backs_diagnosis_idx on public.teach_backs(diagnosis_id);

create table if not exists public.mastery (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid references public.sessions(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  display_name   text not null default '',
  concept        text not null,
  state          text not null default 'red' check (state in ('red','yellow','green','blue')),
  stage          text not null default 'answered',
  updated_at     timestamptz not null default now(),
  unique (participant_id, concept)
);
create index if not exists mastery_session_idx on public.mastery(session_id);

/* ---------------------------------------------------------------- */
/* Realtime                                                          */
/* ---------------------------------------------------------------- */
-- Adding a table twice is an error, so this whole file stays re-runnable.
do $$
declare
  t text;
begin
  foreach t in array array[
    'responses', 'participants', 'questions', 'confusion_maps', 'mastery'
  ] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format(
        'alter publication supabase_realtime add table public.%I', t
      );
    end if;
  end loop;
end $$;

/* ---------------------------------------------------------------- */
/* Row level security                                                */
/* ---------------------------------------------------------------- */
alter table public.profiles          enable row level security;
alter table public.sessions          enable row level security;
alter table public.participants      enable row level security;
alter table public.questions         enable row level security;
alter table public.responses         enable row level security;
alter table public.confusion_maps    enable row level security;
alter table public.diagnoses         enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.teach_backs       enable row level security;
alter table public.mastery           enable row level security;

-- Helper: is the current user a participant in this session?
create or replace function public.is_session_member(target uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.sessions s
    where s.id = target and s.teacher_id = auth.uid()
  ) or exists (
    select 1 from public.participants p
    where p.session_id = target and p.user_id = auth.uid()
  );
$$;

drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (true);

drop policy if exists profiles_self_write on public.profiles;
create policy profiles_self_write on public.profiles
  for update using (id = auth.uid());

-- Resolving a join code has to work before you are a member, but a blanket
-- "anyone may select sessions" policy would let any signed-in user list every
-- classroom and its code. So the lookup goes through a security-definer
-- function that returns exactly one session for an exact code, and the table
-- itself is readable only by its teacher and its participants.
create or replace function public.session_by_code(p_code text)
returns setof public.sessions
language sql
security definer
set search_path = public
stable
as $$
  select * from public.sessions
  where join_code = upper(btrim(p_code))
    and status <> 'ended'
  limit 1;
$$;

revoke all on function public.session_by_code(text) from public;
grant execute on function public.session_by_code(text) to authenticated;

drop policy if exists sessions_read on public.sessions;
create policy sessions_read on public.sessions
  for select using (public.is_session_member(id));

drop policy if exists sessions_teacher_write on public.sessions;
create policy sessions_teacher_write on public.sessions
  for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

-- `user_id = auth.uid()` is not redundant with is_session_member: the app
-- inserts a participant with RETURNING, and the SELECT policy is applied to
-- the returned row. is_session_member is a stable function reading the same
-- table, so within that one statement it cannot yet see the row being
-- inserted and the join fails. A direct column check on the new row does see
-- it. It is also plainly correct — you can always see your own participation.
drop policy if exists participants_read on public.participants;
create policy participants_read on public.participants
  for select using (
    user_id = auth.uid() or public.is_session_member(session_id)
  );

drop policy if exists participants_join on public.participants;
create policy participants_join on public.participants
  for insert with check (user_id = auth.uid() or user_id is null);

drop policy if exists questions_read on public.questions;
create policy questions_read on public.questions
  for select using (public.is_session_member(session_id));

drop policy if exists questions_teacher_write on public.questions;
create policy questions_teacher_write on public.questions
  for all using (
    exists (select 1 from public.sessions s
            where s.id = session_id and s.teacher_id = auth.uid())
  ) with check (
    exists (select 1 from public.sessions s
            where s.id = session_id and s.teacher_id = auth.uid())
  );

drop policy if exists responses_read on public.responses;
create policy responses_read on public.responses
  for select using (public.is_session_member(session_id));

drop policy if exists responses_write on public.responses;
create policy responses_write on public.responses
  for all using (
    exists (select 1 from public.participants p
            where p.id = participant_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.participants p
            where p.id = participant_id and p.user_id = auth.uid())
  );

drop policy if exists confusion_read on public.confusion_maps;
create policy confusion_read on public.confusion_maps
  for select using (public.is_session_member(session_id));

drop policy if exists confusion_write on public.confusion_maps;
create policy confusion_write on public.confusion_maps
  for all using (
    exists (select 1 from public.sessions s
            where s.id = session_id and s.teacher_id = auth.uid())
  ) with check (
    exists (select 1 from public.sessions s
            where s.id = session_id and s.teacher_id = auth.uid())
  );

drop policy if exists diagnoses_owner on public.diagnoses;
create policy diagnoses_owner on public.diagnoses
  for all using (
    exists (select 1 from public.participants p
            where p.id = participant_id and p.user_id = auth.uid())
    or (session_id is not null and public.is_session_member(session_id))
  ) with check (
    exists (select 1 from public.participants p
            where p.id = participant_id and p.user_id = auth.uid())
  );

drop policy if exists practice_owner on public.practice_attempts;
create policy practice_owner on public.practice_attempts
  for all using (
    exists (select 1 from public.diagnoses d
            join public.participants p on p.id = d.participant_id
            where d.id = diagnosis_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.diagnoses d
            join public.participants p on p.id = d.participant_id
            where d.id = diagnosis_id and p.user_id = auth.uid())
  );

drop policy if exists teachback_owner on public.teach_backs;
create policy teachback_owner on public.teach_backs
  for all using (
    exists (select 1 from public.participants p
            where p.id = participant_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.participants p
            where p.id = participant_id and p.user_id = auth.uid())
  );

drop policy if exists mastery_read on public.mastery;
create policy mastery_read on public.mastery
  for select using (
    session_id is null
    or public.is_session_member(session_id)
  );

drop policy if exists mastery_write on public.mastery;
create policy mastery_write on public.mastery
  for all using (
    exists (select 1 from public.participants p
            where p.id = participant_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.participants p
            where p.id = participant_id and p.user_id = auth.uid())
  );
