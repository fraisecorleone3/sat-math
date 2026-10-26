-- =====================================================================
--  SAT Math — schéma Supabase
--  À coller en entier dans Supabase > SQL Editor > New query > Run.
--  Peut être relancé sans risque (il ne supprime aucune donnée).
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
--  TABLES
-- ---------------------------------------------------------------------

-- Un profil par compte (créé automatiquement à l'inscription, voir trigger)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  username    text unique not null,
  role        text not null default 'student' check (role in ('tutor','student')),
  mix_enabled boolean not null default true,
  created_at  timestamptz not null default now()
);

-- La banque de questions
create table if not exists public.questions (
  id          bigint generated always as identity primary key,
  skill       text not null,
  difficulty  text not null check (difficulty in ('Easy','Medium','Hard')),
  type        text not null check (type in ('mcq','spr')),
  stem        text not null,
  choices     jsonb,            -- QCM : liste des choix
  correct     int,              -- QCM : index de la bonne réponse
  answer      text,             -- réponse libre (spr)
  steps       jsonb not null default '[]'::jsonb,
  tip         text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists questions_skill_idx on public.questions(skill, difficulty);

-- Les quiz (séries de questions)
create table if not exists public.quizzes (
  id           bigint generated always as identity primary key,
  skill        text not null,
  level        text not null default 'All',   -- Easy / Medium / Hard / All
  seq          int  not null default 1,
  title        text not null,
  question_ids bigint[] not null default '{}',
  auto         boolean not null default true,
  created_at   timestamptz not null default now()
);
create index if not exists quizzes_skill_idx on public.quizzes(skill, level, seq);

-- Quels quiz chaque élève peut ouvrir
create table if not exists public.access (
  student_id uuid   not null references public.profiles(id) on delete cascade,
  quiz_id    bigint not null references public.quizzes(id)  on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (student_id, quiz_id)
);

-- Les tentatives (résultats)
create table if not exists public.attempts (
  id           bigint generated always as identity primary key,
  student_id   uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  quiz_id      bigint references public.quizzes(id) on delete set null,
  title        text not null,
  question_ids bigint[] not null,
  answers      jsonb not null default '{}'::jsonb,
  flags        jsonb not null default '{}'::jsonb,
  score        int not null,
  total        int not null,
  timed        boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists attempts_student_idx on public.attempts(student_id, created_at desc);

-- Réglages du tuteur (une seule ligne)
create table if not exists public.settings (
  id             int primary key default 1 check (id = 1),
  quiz_size      int not null default 10,
  split_by_level boolean not null default true
);
insert into public.settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
--  FONCTIONS UTILITAIRES
-- ---------------------------------------------------------------------

create or replace function public.is_tutor()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'tutor');
$$;

-- Le site l'appelle avant connexion pour savoir s'il faut proposer
-- la création du compte tuteur (premier lancement).
create or replace function public.tutor_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where role = 'tutor');
$$;
grant execute on function public.tutor_exists() to anon, authenticated;

-- Création automatique du profil à chaque nouveau compte.
-- Le tout premier compte qui demande le rôle tuteur le reçoit ; tous les
-- autres comptes sont élèves (sans aucun quiz ouvert par défaut).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, username, role)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'name',''), split_part(new.email,'@',1)),
    lower(split_part(new.email,'@',1)),
    case
      when coalesce(new.raw_user_meta_data->>'role','') = 'tutor'
       and not exists (select 1 from public.profiles where role = 'tutor')
      then 'tutor' else 'student'
    end
  );
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Le tuteur change le mot de passe d'un élève
create or replace function public.set_student_password(student uuid, new_password text)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_tutor() then raise exception 'Réservé au tuteur'; end if;
  if length(new_password) < 6 then raise exception 'Mot de passe trop court (6 caractères minimum)'; end if;
  if not exists (select 1 from public.profiles where id = student and role = 'student') then
    raise exception 'Élève introuvable';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = student;
end $$;
grant execute on function public.set_student_password(uuid, text) to authenticated;

-- Le tuteur supprime un élève (compte + résultats)
create or replace function public.delete_student(student uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_tutor() then raise exception 'Réservé au tuteur'; end if;
  if not exists (select 1 from public.profiles where id = student and role = 'student') then
    raise exception 'Élève introuvable';
  end if;
  delete from auth.users where id = student;
end $$;
grant execute on function public.delete_student(uuid) to authenticated;

-- ---------------------------------------------------------------------
--  DROITS DE L'API
--  Explicites, pour fonctionner même si « Automatically expose new tables »
--  est décoché à la création du projet. Les visiteurs non connectés (anon)
--  n'ont accès à aucune table ; les règles RLS ci-dessous filtrent le reste.
-- ---------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
revoke all on public.profiles, public.questions, public.quizzes,
              public.access, public.attempts, public.settings from anon;
grant select, insert, update, delete
   on public.profiles, public.questions, public.quizzes,
      public.access, public.attempts, public.settings
   to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.is_tutor() to authenticated;

-- ---------------------------------------------------------------------
--  SÉCURITÉ (Row Level Security)
-- ---------------------------------------------------------------------

alter table public.profiles  enable row level security;
alter table public.questions enable row level security;
alter table public.quizzes   enable row level security;
alter table public.access    enable row level security;
alter table public.attempts  enable row level security;
alter table public.settings  enable row level security;

-- profiles
drop policy if exists profiles_read  on public.profiles;
drop policy if exists profiles_write on public.profiles;
create policy profiles_read  on public.profiles for select using (id = auth.uid() or public.is_tutor());
create policy profiles_write on public.profiles for update using (public.is_tutor()) with check (public.is_tutor());

-- quizzes : l'élève ne voit que les quiz qui lui sont ouverts
drop policy if exists quizzes_read  on public.quizzes;
drop policy if exists quizzes_write on public.quizzes;
create policy quizzes_read on public.quizzes for select using (
  public.is_tutor()
  or exists (select 1 from public.access a where a.quiz_id = quizzes.id and a.student_id = auth.uid())
);
create policy quizzes_write on public.quizzes for all using (public.is_tutor()) with check (public.is_tutor());

-- questions : l'élève ne voit que les questions de ses quiz ouverts
drop policy if exists questions_read  on public.questions;
drop policy if exists questions_write on public.questions;
create policy questions_read on public.questions for select using (
  public.is_tutor()
  or exists (
    select 1 from public.access a
      join public.quizzes q on q.id = a.quiz_id
     where a.student_id = auth.uid() and questions.id = any (q.question_ids)
  )
);
create policy questions_write on public.questions for all using (public.is_tutor()) with check (public.is_tutor());

-- access
drop policy if exists access_read  on public.access;
drop policy if exists access_write on public.access;
create policy access_read  on public.access for select using (student_id = auth.uid() or public.is_tutor());
create policy access_write on public.access for all using (public.is_tutor()) with check (public.is_tutor());

-- attempts : l'élève lit et ajoute les siennes ; le tuteur voit tout
drop policy if exists attempts_read   on public.attempts;
drop policy if exists attempts_insert on public.attempts;
drop policy if exists attempts_delete on public.attempts;
create policy attempts_read   on public.attempts for select using (student_id = auth.uid() or public.is_tutor());
create policy attempts_insert on public.attempts for insert with check (student_id = auth.uid());
create policy attempts_delete on public.attempts for delete using (public.is_tutor());

-- settings
drop policy if exists settings_read  on public.settings;
drop policy if exists settings_write on public.settings;
create policy settings_read  on public.settings for select using (auth.uid() is not null);
create policy settings_write on public.settings for update using (public.is_tutor()) with check (public.is_tutor());
