-- ============================================================
-- JÓVENES · Base de datos completa (un solo archivo)
--
-- Pégalo completo en Supabase → SQL Editor y dale Run.
-- Se puede correr las veces que quieras: si algo ya existe, no lo
-- duplica ni lo borra. Cuando cambie la base, se cambia AQUÍ y se
-- vuelve a correr.
--
-- Fase 1: cuentas, jóvenes, actividades y asistencia.
-- (Finanzas y evidencias se agregan en sus propias secciones después.)
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 1. Tipos
-- ============================================================
do $$ begin create type public.rol_app as enum ('admin', 'encargado', 'joven'); exception when duplicate_object then null; end $$;
do $$ begin create type public.equipo as enum ('asistencia', 'finanzas', 'evidencias'); exception when duplicate_object then null; end $$;
do $$ begin create type public.tipo_actividad as enum ('culto', 'venta', 'salida', 'reunion', 'otra'); exception when duplicate_object then null; end $$;

-- ============================================================
-- 2. Tablas
-- ============================================================

-- ---------- Perfiles (1:1 con auth.users) ----------
-- rol:     admin (todo) · encargado (ve y hace todo menos cuentas) · joven
-- equipos: a qué equipo pertenece (puede ser más de uno)
create table if not exists public.perfiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  nombre      text not null,
  email       text,
  rol         public.rol_app not null default 'joven',
  equipos     public.equipo[] not null default '{}',
  created_at  timestamptz not null default now()
);

-- ---------- Jóvenes del grupo ----------
-- Un joven puede existir sin cuenta (la mayoría). Si se registra con el
-- mismo correo, o con el mismo nombre, su cuenta se liga sola.
create table if not exists public.jovenes (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null check (length(trim(nombre)) > 1),
  email       text check (email is null or email = lower(email)),
  telefono    text,
  perfil_id   uuid unique references public.perfiles (id) on delete set null,
  activo      boolean not null default true,
  created_at  timestamptz not null default now()
);
create unique index if not exists jovenes_nombre_unico on public.jovenes (lower(trim(nombre)));

-- ---------- Actividades ----------
-- Todo cuelga de aquí: asistencia, y después dinero y fotos.
create table if not exists public.actividades (
  id          uuid primary key default gen_random_uuid(),
  titulo      text not null check (length(trim(titulo)) > 0),
  tipo        public.tipo_actividad not null default 'culto',
  fecha       date not null,
  hora        time,
  lugar       text,
  notas       text,
  creado_por  uuid references public.perfiles (id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now()
);
create index if not exists actividades_fecha on public.actividades (fecha);

-- ---------- Asistencia ----------
-- Si hay fila, vino. Si no hay, no vino. Así de simple.
create table if not exists public.asistencias (
  actividad_id uuid not null references public.actividades (id) on delete cascade,
  joven_id     uuid not null references public.jovenes (id) on delete cascade,
  marcado_por  uuid references public.perfiles (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  primary key (actividad_id, joven_id)
);
create index if not exists asistencias_joven on public.asistencias (joven_id);

-- ---------- Correos que entran como admin ----------
create table if not exists public.correos_admin (
  email text primary key check (email = lower(email))
);
insert into public.correos_admin (email) values ('aperezmdz21@gmail.com') on conflict do nothing;

-- ============================================================
-- 3. Helpers de permisos (security definer para evitar recursión RLS)
-- ============================================================

-- Fecha de hoy en Mérida (Supabase vive en UTC y los cultos de noche ya son "mañana" allá)
create or replace function public.hoy()
returns date language sql stable as $$
  select (now() at time zone 'America/Merida')::date
$$;

create or replace function public.rol_actual()
returns public.rol_app language sql stable security definer set search_path = public as $$
  select rol from public.perfiles where id = auth.uid()
$$;

create or replace function public.es_miembro()
returns boolean language sql stable security definer set search_path = public as $$
  select public.rol_actual() is not null
$$;

create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.rol_actual() = 'admin', false)
$$;

create or replace function public.es_encargado()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.rol_actual() in ('admin', 'encargado'), false)
$$;

-- Encargados cuentan como parte de todos los equipos
create or replace function public.en_equipo(e public.equipo)
returns boolean language sql stable security definer set search_path = public as $$
  select public.es_encargado()
      or coalesce((select e = any (equipos) from public.perfiles where id = auth.uid()), false)
$$;

-- Cualquiera de un equipo puede crear actividades (finanzas crea sus ventas, etc.)
create or replace function public.puede_organizar()
returns boolean language sql stable security definer set search_path = public as $$
  select public.es_encargado()
      or coalesce((select cardinality(equipos) > 0 from public.perfiles where id = auth.uid()), false)
$$;

-- La ficha de joven ligada a la cuenta actual
create or replace function public.mi_joven_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.jovenes where perfil_id = auth.uid()
$$;

-- ============================================================
-- 4. RLS
-- ============================================================
alter table public.perfiles      enable row level security;
alter table public.jovenes       enable row level security;
alter table public.actividades   enable row level security;
alter table public.asistencias   enable row level security;
alter table public.correos_admin enable row level security;

-- Perfiles: todos ven nombres; solo admin cambia roles y equipos.
drop policy if exists "perfiles_leer"  on public.perfiles;
drop policy if exists "perfiles_admin" on public.perfiles;
create policy "perfiles_leer"  on public.perfiles for select to authenticated using (public.es_miembro());
create policy "perfiles_admin" on public.perfiles for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- Jóvenes: todos ven la lista; el equipo de asistencia la mantiene.
drop policy if exists "jovenes_leer"     on public.jovenes;
drop policy if exists "jovenes_escribir" on public.jovenes;
create policy "jovenes_leer"     on public.jovenes for select to authenticated using (public.es_miembro());
create policy "jovenes_escribir" on public.jovenes for all    to authenticated
  using (public.en_equipo('asistencia')) with check (public.en_equipo('asistencia'));

-- Actividades: todos las ven; cualquier equipo las crea y edita.
drop policy if exists "actividades_leer"     on public.actividades;
drop policy if exists "actividades_escribir" on public.actividades;
create policy "actividades_leer"     on public.actividades for select to authenticated using (public.es_miembro());
create policy "actividades_escribir" on public.actividades for all    to authenticated
  using (public.puede_organizar()) with check (public.puede_organizar());

-- Asistencia: el equipo de asistencia ve y marca todo; cada joven ve solo la suya.
drop policy if exists "asistencias_leer"     on public.asistencias;
drop policy if exists "asistencias_escribir" on public.asistencias;
create policy "asistencias_leer"     on public.asistencias for select to authenticated
  using (public.en_equipo('asistencia') or joven_id = public.mi_joven_id());
create policy "asistencias_escribir" on public.asistencias for all    to authenticated
  using (public.en_equipo('asistencia')) with check (public.en_equipo('asistencia'));

drop policy if exists "correos_admin_admin" on public.correos_admin;
create policy "correos_admin_admin" on public.correos_admin
  for all to authenticated using (public.es_admin()) with check (public.es_admin());

grant select, insert, update, delete on
  public.perfiles, public.jovenes, public.actividades, public.asistencias, public.correos_admin
  to authenticated;

-- ============================================================
-- 5. Resumen de asistencia por joven
-- ============================================================
-- recientes: cuántas veces vino en las últimas p_semanas
-- total:     cuántas veces ha venido en total
-- ultima:    fecha de la última actividad a la que vino
-- (security invoker: respeta el RLS de quien la llama)
create or replace function public.resumen_jovenes(p_semanas int default 8)
returns table (joven_id uuid, nombre text, activo boolean, recientes int, total int, ultima date)
language sql stable security invoker set search_path = public as $$
  select j.id, j.nombre, j.activo,
         count(act.id) filter (where act.fecha >= public.hoy() - p_semanas * 7)::int,
         count(act.id)::int,
         max(act.fecha)
    from public.jovenes j
    left join public.asistencias a on a.joven_id = j.id
    left join public.actividades act on act.id = a.actividad_id and act.fecha <= public.hoy()
   group by j.id, j.nombre, j.activo
$$;
grant execute on function public.resumen_jovenes(int) to authenticated;

-- ============================================================
-- 6. Alta de usuarios: perfil + admin por correo + ligar con su ficha
-- ============================================================

-- "José  Pérez", "jose perez" → "jose perez"
create or replace function public.normalizar_nombre(t text)
returns text language sql immutable as $$
  select lower(translate(regexp_replace(trim(coalesce(t, '')), '\s+', ' ', 'g'),
                         'áéíóúüñÁÉÍÓÚÜÑ', 'aeiouunAEIOUUN'))
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  -- Correo/contraseña manda "nombre"; Google manda "full_name"/"name"; Apple a veces nada
  v_nombre text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    split_part(new.email, '@', 1));
  v_joven  uuid;
begin
  insert into public.perfiles (id, nombre, email, rol)
  values (
    new.id, v_nombre, lower(new.email),
    case when exists (select 1 from public.correos_admin where email = lower(new.email))
         then 'admin'::public.rol_app else 'joven' end
  )
  on conflict (id) do nothing;

  -- 1) por correo
  update public.jovenes set perfil_id = new.id
   where email = lower(new.email) and perfil_id is null;

  -- 2) si no, por nombre (solo si hay exactamente UNA ficha libre con ese nombre)
  if not found then
    select id into v_joven from public.jovenes
     where perfil_id is null and public.normalizar_nombre(nombre) = public.normalizar_nombre(v_nombre);
    if found and (select count(*) from public.jovenes
                   where perfil_id is null and public.normalizar_nombre(nombre) = public.normalizar_nombre(v_nombre)) = 1 then
      update public.jovenes set perfil_id = new.id where id = v_joven;
    end if;
  end if;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Al poner el correo en una ficha, ligarla si esa persona ya tiene cuenta
create or replace function public.ligar_joven_por_correo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.email is not null and new.perfil_id is null then
    select id into new.perfil_id from public.perfiles p
     where p.email = new.email
       and not exists (select 1 from public.jovenes j where j.perfil_id = p.id and j.id <> new.id);
  end if;
  return new;
end $$;

drop trigger if exists jovenes_ligar_correo on public.jovenes;
create trigger jovenes_ligar_correo
  before insert or update of email on public.jovenes
  for each row execute function public.ligar_joven_por_correo();

-- Cuentas que ya existían antes de correr este archivo
insert into public.perfiles (id, nombre, email, rol)
select u.id,
       coalesce(nullif(trim(u.raw_user_meta_data ->> 'nombre'), ''),
                nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
                nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
                split_part(u.email, '@', 1)),
       lower(u.email), 'joven'
  from auth.users u
 where not exists (select 1 from public.perfiles p where p.id = u.id);

update public.perfiles set rol = 'admin'
 where email in (select email from public.correos_admin) and rol <> 'admin';

-- ============================================================
-- 7. FINANZAS (fase 2)
--    Regla de oro: los movimientos NO se borran ni se editan.
--    Si algo está mal, se anula con un motivo y se registra bien.
-- ============================================================
do $$ begin create type public.tipo_mov as enum ('entrada', 'salida'); exception when duplicate_object then null; end $$;
do $$ begin create type public.categoria_mov as enum
  ('venta', 'cooperacion', 'donacion', 'ofrenda', 'compra', 'comida', 'transporte', 'material', 'otro');
  exception when duplicate_object then null; end $$;

-- ---------- Cooperaciones ("todos ponen $100 para el retiro") ----------
create table if not exists public.cooperaciones (
  id            uuid primary key default gen_random_uuid(),
  concepto      text not null check (length(trim(concepto)) > 0),
  monto         numeric(12,2) not null check (monto > 0),   -- por persona
  fecha_limite  date,
  actividad_id  uuid references public.actividades (id) on delete set null,
  cerrada       boolean not null default false,
  creado_por    uuid references public.perfiles (id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now()
);

-- A quién no le toca (no va al retiro, está exento, etc.)
create table if not exists public.cooperacion_excluidos (
  cooperacion_id uuid not null references public.cooperaciones (id) on delete cascade,
  joven_id       uuid not null references public.jovenes (id) on delete cascade,
  primary key (cooperacion_id, joven_id)
);

-- ---------- Movimientos de dinero ----------
create table if not exists public.movimientos (
  id              uuid primary key default gen_random_uuid(),
  tipo            public.tipo_mov not null,
  categoria       public.categoria_mov not null default 'otro',
  concepto        text not null check (length(trim(concepto)) > 0),
  monto           numeric(12,2) not null check (monto > 0),
  fecha           date not null default public.hoy(),
  actividad_id    uuid references public.actividades (id) on delete set null,
  cooperacion_id  uuid references public.cooperaciones (id) on delete restrict,
  joven_id        uuid references public.jovenes (id) on delete restrict,   -- quién pagó (cooperaciones)
  registrado_por  uuid references public.perfiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  anulado         boolean not null default false,
  anulado_motivo  text,
  anulado_por     uuid references public.perfiles (id) on delete set null,
  anulado_at      timestamptz,
  constraint mov_cooperacion_con_joven check (cooperacion_id is null or (tipo = 'entrada' and joven_id is not null)),
  constraint mov_anulado_con_motivo  check (not anulado or length(trim(coalesce(anulado_motivo, ''))) > 2)
);
create index if not exists movimientos_fecha       on public.movimientos (fecha);
create index if not exists movimientos_actividad   on public.movimientos (actividad_id);
create index if not exists movimientos_cooperacion on public.movimientos (cooperacion_id);

-- Candado: solo se puede ANULAR (una vez). Nada de editar ni borrar.
create or replace function public.proteger_movimientos()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Los movimientos no se borran: anúlalo con un motivo.';
  end if;
  if old.anulado then
    raise exception 'Ese movimiento ya está anulado.';
  end if;
  if (new.tipo, new.categoria, new.concepto, new.monto, new.fecha, new.actividad_id,
      new.cooperacion_id, new.joven_id, new.registrado_por, new.created_at)
     is distinct from
     (old.tipo, old.categoria, old.concepto, old.monto, old.fecha, old.actividad_id,
      old.cooperacion_id, old.joven_id, old.registrado_por, old.created_at) then
    raise exception 'Los movimientos no se editan: anúlalo y regístralo de nuevo.';
  end if;
  if new.anulado then
    new.anulado_por := auth.uid();
    new.anulado_at  := now();
  end if;
  return new;
end $$;

drop trigger if exists movimientos_candado on public.movimientos;
create trigger movimientos_candado
  before update or delete on public.movimientos
  for each row execute function public.proteger_movimientos();

-- ---------- RLS ----------
alter table public.cooperaciones         enable row level security;
alter table public.cooperacion_excluidos enable row level security;
alter table public.movimientos           enable row level security;

-- Cooperaciones: todos las ven (para saber cuánto deben); finanzas las maneja.
drop policy if exists "cooperaciones_leer"     on public.cooperaciones;
drop policy if exists "cooperaciones_escribir" on public.cooperaciones;
create policy "cooperaciones_leer"     on public.cooperaciones for select to authenticated using (public.es_miembro());
create policy "cooperaciones_escribir" on public.cooperaciones for all    to authenticated
  using (public.en_equipo('finanzas')) with check (public.en_equipo('finanzas'));

drop policy if exists "excluidos_leer"     on public.cooperacion_excluidos;
drop policy if exists "excluidos_escribir" on public.cooperacion_excluidos;
create policy "excluidos_leer"     on public.cooperacion_excluidos for select to authenticated using (public.es_miembro());
create policy "excluidos_escribir" on public.cooperacion_excluidos for all    to authenticated
  using (public.en_equipo('finanzas')) with check (public.en_equipo('finanzas'));

-- Movimientos: finanzas ve todo; cada joven ve solo lo que él pagó. Sin política de borrar.
drop policy if exists "movimientos_leer"     on public.movimientos;
drop policy if exists "movimientos_insertar" on public.movimientos;
drop policy if exists "movimientos_anular"   on public.movimientos;
create policy "movimientos_leer"     on public.movimientos for select to authenticated
  using (public.en_equipo('finanzas') or (joven_id is not null and joven_id = public.mi_joven_id()));
create policy "movimientos_insertar" on public.movimientos for insert to authenticated
  with check (public.en_equipo('finanzas'));
create policy "movimientos_anular"   on public.movimientos for update to authenticated
  using (public.en_equipo('finanzas')) with check (public.en_equipo('finanzas'));

grant select, insert, update, delete on public.cooperaciones, public.cooperacion_excluidos to authenticated;
grant select, insert, update on public.movimientos to authenticated;

-- ---------- Consultas ----------
-- Saldo actual (sin anulados)
create or replace function public.saldo()
returns numeric language sql stable security invoker set search_path = public as $$
  select coalesce(sum(case when tipo = 'entrada' then monto else -monto end), 0)
    from public.movimientos where not anulado
$$;

-- Estado de una cooperación por joven: cuánto ha dado y si le toca
create or replace function public.estado_cooperacion(p_id uuid)
returns table (joven_id uuid, nombre text, aportado numeric, excluido boolean)
language sql stable security invoker set search_path = public as $$
  select j.id, j.nombre,
         coalesce(sum(m.monto) filter (where not m.anulado), 0),
         exists (select 1 from public.cooperacion_excluidos x where x.cooperacion_id = p_id and x.joven_id = j.id)
    from public.jovenes j
    left join public.movimientos m on m.joven_id = j.id and m.cooperacion_id = p_id
   where j.activo or m.id is not null
   group by j.id, j.nombre
$$;

-- Lo que me toca dar a mí (para la pantalla de inicio del joven)
create or replace function public.mis_cooperaciones()
returns table (id uuid, concepto text, monto numeric, fecha_limite date, aportado numeric, excluido boolean)
language sql stable security invoker set search_path = public as $$
  select c.id, c.concepto, c.monto, c.fecha_limite,
         coalesce(sum(m.monto) filter (where not m.anulado), 0),
         exists (select 1 from public.cooperacion_excluidos x where x.cooperacion_id = c.id and x.joven_id = public.mi_joven_id())
    from public.cooperaciones c
    left join public.movimientos m on m.cooperacion_id = c.id and m.joven_id = public.mi_joven_id()
   where not c.cerrada and public.mi_joven_id() is not null
   group by c.id
$$;

grant execute on function public.saldo(), public.estado_cooperacion(uuid), public.mis_cooperaciones() to authenticated;

-- ============================================================
-- 8. EVIDENCIAS (fase 3)
--    Las fotos NO viven aquí: viven en Google Drive (carpeta Evidencias).
--    La app las lee y las acomoda por fecha. Aquí solo va el ticket de cada gasto.
-- ============================================================
alter table public.movimientos add column if not exists comprobante text;   -- id del archivo en Drive (Evidencias/Tickets)
