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
-- (Se borra primero: en la sección 15 cambia lo que regresa y no se puede "reemplazar" encima)
drop function if exists public.resumen_jovenes(int);
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

-- ============================================================
-- 9. CATEGORÍAS EDITABLES
--    Antes eran una lista fija (enum). Ahora finanzas puede crear las suyas.
--    movimientos.categoria guarda la clave ('comida', 'renta-de-sillas', …).
-- ============================================================
create table if not exists public.categorias (
  id      text primary key check (id ~ '^[a-z0-9-]+$'),
  nombre  text not null check (length(trim(nombre)) > 0),
  tipo    text not null default 'ambos' check (tipo in ('entrada', 'salida', 'ambos')),
  activa  boolean not null default true,
  orden   int not null default 100
);
create unique index if not exists categorias_nombre_unico on public.categorias (lower(trim(nombre)));

insert into public.categorias (id, nombre, tipo, orden) values
  ('venta', 'Venta', 'entrada', 1), ('cooperacion', 'Cooperación', 'entrada', 2),
  ('donacion', 'Donación', 'entrada', 3), ('ofrenda', 'Ofrenda', 'entrada', 4),
  ('compra', 'Compra', 'salida', 10), ('comida', 'Comida', 'salida', 11),
  ('transporte', 'Transporte', 'salida', 12), ('material', 'Material', 'salida', 13),
  ('otro', 'Otro', 'ambos', 99)
on conflict (id) do nothing;

-- Pasar la columna de enum a texto ligado a la tabla (solo la primera vez)
do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema = 'public' and table_name = 'movimientos'
                and column_name = 'categoria' and udt_name = 'categoria_mov') then
    alter table public.movimientos alter column categoria drop default;
    alter table public.movimientos alter column categoria type text using categoria::text;
    alter table public.movimientos alter column categoria set default 'otro';
  end if;
  if not exists (select 1 from pg_constraint where conname = 'movimientos_categoria_fk') then
    alter table public.movimientos
      add constraint movimientos_categoria_fk foreign key (categoria)
      references public.categorias (id) on update cascade on delete restrict;
  end if;
end $$;

alter table public.categorias enable row level security;
drop policy if exists "categorias_leer"     on public.categorias;
drop policy if exists "categorias_escribir" on public.categorias;
create policy "categorias_leer"     on public.categorias for select to authenticated using (public.es_miembro());
create policy "categorias_escribir" on public.categorias for all    to authenticated
  using (public.en_equipo('finanzas')) with check (public.en_equipo('finanzas'));
grant select, insert, update, delete on public.categorias to authenticated;

-- ============================================================
-- 10. PERMISOS POR EQUIPO + TODOS LOS REGISTRADOS SON JÓVENES
--   · Finanzas  → solo admin y equipo de finanzas.
--   · Evidencias → solo admin y equipo de evidencias.
--   · Asistencia → admin, encargados y equipo de asistencia.
--   · Quien crea cuenta aparece en Jóvenes (los admins no).
--   (Estas definiciones reemplazan a las de arriba.)
-- ============================================================
create or replace function public.en_equipo(e public.equipo)
returns boolean language sql stable security definer set search_path = public as $$
  select public.es_admin()
      or (e = 'asistencia' and public.es_encargado())
      or coalesce((select e = any (equipos) from public.perfiles where id = auth.uid()), false)
$$;

-- La lista de jóvenes no incluye a los admins
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
   where not exists (select 1 from public.perfiles p where p.id = j.perfil_id and p.rol = 'admin')
   group by j.id, j.nombre, j.activo
$$;

-- Ligar una cuenta con su ficha (por correo, luego por nombre) o crearle una
create or replace function public.asegurar_ficha(p_perfil uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  p public.perfiles;
  v uuid;
begin
  select * into p from public.perfiles where id = p_perfil;
  if not found then return null; end if;
  select id into v from public.jovenes where perfil_id = p.id;
  if found then return v; end if;

  update public.jovenes set perfil_id = p.id
   where id = (select id from public.jovenes where perfil_id is null and email = p.email limit 1)
  returning id into v;
  if v is not null then return v; end if;

  if (select count(*) from public.jovenes
       where perfil_id is null and public.normalizar_nombre(nombre) = public.normalizar_nombre(p.nombre)) = 1 then
    update public.jovenes set perfil_id = p.id
     where perfil_id is null and public.normalizar_nombre(nombre) = public.normalizar_nombre(p.nombre)
    returning id into v;
    return v;
  end if;

  -- Nombre válido (Apple a veces no manda nada) y, si ya hay alguien que se llama igual,
  -- se le agrega su correo para distinguirlos. Nunca debe tumbar un registro.
  begin
    insert into public.jovenes (nombre, email, perfil_id)
    values (case when length(trim(p.nombre)) > 1 then trim(p.nombre) else 'Sin nombre' end, p.email, p.id)
    returning id into v;
  exception when unique_violation then
    begin
      insert into public.jovenes (nombre, email, perfil_id)
      values (case when length(trim(p.nombre)) > 1 then trim(p.nombre) else 'Sin nombre' end || ' (' || split_part(coalesce(p.email, p.id::text), '@', 1) || ')', p.email, p.id)
      returning id into v;
    exception when others then v := null;
    end;
  when others then v := null;
  end;
  return v;
end $$;
revoke all on function public.asegurar_ficha(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.perfiles (id, nombre, email, rol)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'nombre'), ''),
             nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
             nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
             split_part(new.email, '@', 1)),
    lower(new.email),
    case when exists (select 1 from public.correos_admin where email = lower(new.email))
         then 'admin'::public.rol_app else 'joven' end
  )
  on conflict (id) do nothing;
  perform public.asegurar_ficha(new.id);
  return new;
end $$;

-- Cuentas que ya existían sin ficha
do $$ declare r record; begin
  for r in select p.id from public.perfiles p where not exists (select 1 from public.jovenes j where j.perfil_id = p.id) loop
    perform public.asegurar_ficha(r.id);
  end loop;
end $$;

-- ---------- Fusionar fichas repetidas ("Andy" y "Andrés Pérez" son la misma persona) ----------
-- Se queda con p_destino; le pasa asistencia, pagos, exclusiones, cuenta y datos de p_origen.
create or replace function public.fusionar_jovenes(p_origen uuid, p_destino uuid)
returns void language plpgsql security definer set search_path = public as $$
declare o public.jovenes; d public.jovenes;
begin
  if not public.en_equipo('asistencia') then raise exception 'No tienes permiso para hacer eso.'; end if;
  if p_origen = p_destino then raise exception 'Elige a otra persona.'; end if;
  select * into o from public.jovenes where id = p_origen;
  select * into d from public.jovenes where id = p_destino;
  if o.id is null or d.id is null then raise exception 'No se encontró a uno de los dos.'; end if;
  if o.perfil_id is not null and d.perfil_id is not null then
    raise exception 'Los dos tienen cuenta: no se pueden juntar.';
  end if;

  insert into public.asistencias (actividad_id, joven_id, marcado_por, created_at)
  select actividad_id, p_destino, marcado_por, created_at from public.asistencias where joven_id = p_origen
  on conflict do nothing;
  insert into public.cooperacion_excluidos (cooperacion_id, joven_id)
  select cooperacion_id, p_destino from public.cooperacion_excluidos where joven_id = p_origen
  on conflict do nothing;

  perform set_config('jovenes.fusion', 'si', true);   -- deja pasar el candado de movimientos
  update public.movimientos set joven_id = p_destino where joven_id = p_origen;

  update public.jovenes set perfil_id = null where id = p_origen;
  update public.jovenes set
    perfil_id = coalesce(d.perfil_id, o.perfil_id),
    email     = coalesce(d.email, o.email),
    telefono  = coalesce(d.telefono, o.telefono),
    activo    = d.activo or o.activo
  where id = p_destino;
  delete from public.jovenes where id = p_origen;
end $$;
grant execute on function public.fusionar_jovenes(uuid, uuid) to authenticated;

-- Candado de movimientos: igual que antes, pero deja pasar la fusión de fichas
create or replace function public.proteger_movimientos()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Los movimientos no se borran: anúlalo con un motivo.';
  end if;
  if current_setting('jovenes.fusion', true) = 'si' then
    return new;
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

-- ============================================================
-- 11. HORARIOS FIJOS → ACTIVIDADES DE CADA DÍA
--    Cada horario (oración de 5, consagración, dominical…) genera su actividad
--    del día sola, para que solo se abra y se pase lista.
--    dias: 1 = lunes … 7 = domingo
-- ============================================================
create table if not exists public.horarios (
  id         uuid primary key default gen_random_uuid(),
  titulo     text not null check (length(trim(titulo)) > 0),
  tipo       public.tipo_actividad not null default 'culto',
  dias       int[] not null check (cardinality(dias) > 0 and dias <@ array[1,2,3,4,5,6,7]),
  hora       time not null,
  hora_fin   time,
  lugar      text,
  activo     boolean not null default true,
  orden      int not null default 100,
  created_at timestamptz not null default now()
);

alter table public.actividades add column if not exists horario_id uuid references public.horarios (id) on delete set null;
alter table public.actividades add column if not exists hora_fin   time;
alter table public.actividades add column if not exists cancelada  boolean not null default false;
create unique index if not exists actividades_horario_dia on public.actividades (horario_id, fecha) where horario_id is not null;

-- Horarios de la congregación (solo la primera vez; luego se editan en la app)
insert into public.horarios (titulo, dias, hora, hora_fin, orden)
select * from (values
  ('Oración de 5',             array[1,2,3,4,5,6],   time '05:00', null::time,   1),
  ('Dominical',                array[7],             time '10:00', time '12:00', 2),
  ('Servicio de alabanzas',    array[4,7],           time '18:00', time '20:00', 3),
  ('Oración de 7',             array[1,2,3,5,6],     time '19:00', time '20:00', 4),
  ('Consagración apostólica',  array[1,2,3,4,5,6,7], time '20:00', null::time,   5)
) v(titulo, dias, hora, hora_fin, orden)
where not exists (select 1 from public.horarios);

-- Corrección de horarios ya cargados: la oración de 5 no es en domingo y la de 7 dura hasta las 8.
-- Solo toca los que siguen como venían de fábrica (si ya los editaste en la app, no les hace nada).
update public.horarios set dias = array[1,2,3,4,5,6]
 where titulo = 'Oración de 5' and dias = array[1,2,3,4,5,6,7];
update public.horarios set hora_fin = time '20:00'
 where titulo = 'Oración de 7' and hora_fin is null;

alter table public.horarios enable row level security;
drop policy if exists "horarios_leer"     on public.horarios;
drop policy if exists "horarios_escribir" on public.horarios;
create policy "horarios_leer"     on public.horarios for select to authenticated using (public.es_miembro());
create policy "horarios_escribir" on public.horarios for all    to authenticated
  using (public.es_encargado()) with check (public.es_encargado());
grant select, insert, update, delete on public.horarios to authenticated;

-- Crea las actividades de los horarios entre dos fechas (no duplica; máximo 62 días).
-- Cualquiera con cuenta la puede llamar: solo agrega lo que falta.
create or replace function public.generar_actividades(p_desde date, p_hasta date)
returns int language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if not public.es_miembro() then return 0; end if;
  if p_hasta < p_desde or p_hasta - p_desde > 62 then raise exception 'Rango inválido.'; end if;
  insert into public.actividades (titulo, tipo, fecha, hora, hora_fin, lugar, horario_id, creado_por)
  select h.titulo, h.tipo, d::date, h.hora, h.hora_fin, h.lugar, h.id, null
    from public.horarios h
    cross join generate_series(p_desde, p_hasta, interval '1 day') d
   where h.activo and extract(isodow from d)::int = any (h.dias)
  on conflict (horario_id, fecha) where horario_id is not null do nothing;
  get diagnostics n = row_count;
  return n;
end $$;
grant execute on function public.generar_actividades(date, date) to authenticated;

-- Al cambiar un horario, las actividades que vienen (sin asistencia todavía) se ajustan
create or replace function public.ajustar_horario()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.actividades a
     set titulo = new.titulo, tipo = new.tipo, hora = new.hora, hora_fin = new.hora_fin, lugar = new.lugar,
         cancelada = case when not new.activo or not (extract(isodow from a.fecha)::int = any (new.dias)) then true else a.cancelada end
   where a.horario_id = new.id and a.fecha > public.hoy()
     and not exists (select 1 from public.asistencias s where s.actividad_id = a.id);
  return new;
end $$;
drop trigger if exists horarios_ajustar on public.horarios;
create trigger horarios_ajustar after update on public.horarios
  for each row execute function public.ajustar_horario();

-- Oraciones de 5 en domingo que ya se habían creado y nadie pasó lista: se cancelan
update public.actividades a set cancelada = true
  from public.horarios h
 where a.horario_id = h.id and h.titulo = 'Oración de 5'
   and extract(isodow from a.fecha)::int = 7 and not a.cancelada
   and not exists (select 1 from public.asistencias s where s.actividad_id = a.id);

-- La asistencia de actividades canceladas no cuenta
create or replace function public.resumen_jovenes(p_semanas int default 8)
returns table (joven_id uuid, nombre text, activo boolean, recientes int, total int, ultima date)
language sql stable security invoker set search_path = public as $$
  select j.id, j.nombre, j.activo,
         count(act.id) filter (where act.fecha >= public.hoy() - p_semanas * 7)::int,
         count(act.id)::int,
         max(act.fecha)
    from public.jovenes j
    left join public.asistencias a on a.joven_id = j.id
    left join public.actividades act on act.id = a.actividad_id and act.fecha <= public.hoy() and not act.cancelada
   where not exists (select 1 from public.perfiles p where p.id = j.perfil_id and p.rol = 'admin')
   group by j.id, j.nombre, j.activo
$$;

-- ============================================================
-- 12. ENCARGADOS DE CADA GRUPO + LIGAR CUENTAS POR NOMBRE COMPLETO
--   · perfiles.lider_de: de qué grupos es encargado (puede agregar/quitar miembros de ese grupo).
--   · Al registrarse con su nombre completo, la cuenta se liga con el nombre importado
--     aunque falte un apellido o no lleve acentos.
-- ============================================================
alter table public.perfiles add column if not exists lider_de public.equipo[] not null default '{}';

-- El encargado de un grupo también es parte de él
create or replace function public.en_equipo(e public.equipo)
returns boolean language sql stable security definer set search_path = public as $$
  select public.es_admin()
      or (e = 'asistencia' and public.es_encargado())
      or coalesce((select e = any (equipos) or e = any (lider_de) from public.perfiles where id = auth.uid()), false)
$$;

create or replace function public.es_lider(e public.equipo)
returns boolean language sql stable security definer set search_path = public as $$
  select public.es_admin()
      or coalesce((select e = any (lider_de) from public.perfiles where id = auth.uid()), false)
$$;

create or replace function public.puede_organizar()
returns boolean language sql stable security definer set search_path = public as $$
  select public.es_encargado()
      or coalesce((select cardinality(equipos) > 0 or cardinality(lider_de) > 0 from public.perfiles where id = auth.uid()), false)
$$;

-- Agregar / quitar a alguien de un grupo (admin o encargado de ese grupo)
create or replace function public.agregar_a_grupo(p_perfil uuid, p_equipo public.equipo)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.es_lider(p_equipo) then raise exception 'Solo el encargado de ese grupo puede agregar miembros.'; end if;
  update public.perfiles
     set equipos = array(select distinct unnest(equipos || p_equipo))
   where id = p_perfil;
  if not found then raise exception 'No se encontró esa cuenta.'; end if;
end $$;

create or replace function public.quitar_de_grupo(p_perfil uuid, p_equipo public.equipo)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.es_lider(p_equipo) then raise exception 'Solo el encargado de ese grupo puede quitar miembros.'; end if;
  if p_perfil = auth.uid() and not public.es_admin() then raise exception 'No te puedes quitar a ti mismo.'; end if;
  if not public.es_admin() and exists (select 1 from public.perfiles where id = p_perfil and p_equipo = any (lider_de)) then
    raise exception 'A otro encargado solo lo puede quitar un admin.';
  end if;
  update public.perfiles
     set equipos = array_remove(equipos, p_equipo), lider_de = array_remove(lider_de, p_equipo)
   where id = p_perfil;
end $$;

-- Hacer / dejar de ser encargado de un grupo (solo admin)
create or replace function public.cambiar_lider(p_perfil uuid, p_equipo public.equipo, p_lider boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'Solo un admin puede nombrar encargados de grupo.'; end if;
  update public.perfiles set
    lider_de = case when p_lider then array(select distinct unnest(lider_de || p_equipo)) else array_remove(lider_de, p_equipo) end,
    equipos  = array(select distinct unnest(equipos || p_equipo))
   where id = p_perfil;
end $$;
grant execute on function public.agregar_a_grupo(uuid, public.equipo), public.quitar_de_grupo(uuid, public.equipo),
  public.cambiar_lider(uuid, public.equipo, boolean), public.es_lider(public.equipo) to authenticated;

-- ---------- Buscar la ficha por nombre completo ----------
-- "abner ribon dzul" encuentra "Abner Manuel Ribón Dzul": todas las palabras que escribió
-- (mínimo nombre y apellido) están en la ficha. Solo si hay UNA que cuadre.
create or replace function public.ficha_por_nombre(p_nombre text)
returns uuid language sql stable security definer set search_path = public as $$
  with buscado as (
    select array_remove(string_to_array(public.normalizar_nombre(p_nombre), ' '), '') as p
  ), candidatas as (
    select j.id,
           public.normalizar_nombre(j.nombre) = public.normalizar_nombre(p_nombre) as exacta
      from public.jovenes j, buscado b
     where j.perfil_id is null
       and cardinality(b.p) >= 2
       and b.p <@ array_remove(string_to_array(public.normalizar_nombre(j.nombre), ' '), '')
  )
  select coalesce(
    (select id from candidatas where exacta limit 1),
    (select id from candidatas where (select count(*) from candidatas) = 1)
  )
$$;
revoke all on function public.ficha_por_nombre(text) from public, anon, authenticated;

create or replace function public.asegurar_ficha(p_perfil uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  p public.perfiles;
  v uuid;
begin
  select * into p from public.perfiles where id = p_perfil;
  if not found then return null; end if;
  select id into v from public.jovenes where perfil_id = p.id;
  if found then return v; end if;

  -- 1) por correo
  update public.jovenes set perfil_id = p.id
   where id = (select id from public.jovenes where perfil_id is null and email = p.email limit 1)
  returning id into v;
  if v is not null then return v; end if;

  -- 2) por nombre completo (aunque falte un apellido o no lleve acentos)
  v := public.ficha_por_nombre(p.nombre);
  if v is not null then
    update public.jovenes set perfil_id = p.id, email = coalesce(email, p.email) where id = v;
    return v;
  end if;

  -- 3) ficha nueva. Nunca debe tumbar un registro.
  begin
    insert into public.jovenes (nombre, email, perfil_id)
    values (case when length(trim(p.nombre)) > 1 then trim(p.nombre) else 'Sin nombre' end, p.email, p.id)
    returning id into v;
  exception when unique_violation then
    begin
      insert into public.jovenes (nombre, email, perfil_id)
      values (case when length(trim(p.nombre)) > 1 then trim(p.nombre) else 'Sin nombre' end || ' (' || split_part(coalesce(p.email, p.id::text), '@', 1) || ')', p.email, p.id)
      returning id into v;
    exception when others then v := null;
    end;
  when others then v := null;
  end;
  return v;
end $$;

-- Cuentas que ya existían: si su ficha se creó sola (sin asistencia ni pagos) y ahora hay
-- un nombre importado que cuadra, se pasan a ese y se borra la ficha vacía.
do $$ declare r record; v uuid; begin
  for r in
    select p.id as perfil, p.nombre, j.id as ficha
      from public.perfiles p join public.jovenes j on j.perfil_id = p.id
     where not exists (select 1 from public.asistencias a where a.joven_id = j.id)
       and not exists (select 1 from public.movimientos m where m.joven_id = j.id)
  loop
    v := public.ficha_por_nombre(r.nombre);
    if v is not null and v <> r.ficha then
      update public.jovenes set perfil_id = null where id = r.ficha;
      delete from public.jovenes where id = r.ficha;
      update public.jovenes set perfil_id = r.perfil where id = v;
    end if;
  end loop;
end $$;

-- ============================================================
-- 13. BUSCAR TU NOMBRE AL REGISTRARTE
--   "¿No sabes cómo sales en la lista?" → nombres parecidos mientras escribe.
--   Es público (todavía no hay sesión), así que va con candados:
--   mínimo 3 letras, máximo 5 resultados, solo fichas activas SIN cuenta y solo el nombre.
-- ============================================================
create or replace function public.buscar_nombres(p_texto text)
returns table (nombre text)
language sql stable security definer set search_path = public as $$
  with buscado as (
    select array_remove(string_to_array(public.normalizar_nombre(p_texto), ' '), '') as p
  )
  select j.nombre
    from public.jovenes j, buscado b
   where length(replace(public.normalizar_nombre(p_texto), ' ', '')) >= 3
     and j.perfil_id is null
     and j.activo
     -- cada palabra que escribió es el inicio de alguna palabra del nombre ("abn rib" → "Abner … Ribón")
     and not exists (
       select 1 from unnest(b.p) t
        where not exists (
          select 1 from unnest(string_to_array(public.normalizar_nombre(j.nombre), ' ')) n
           where n like t || '%'
        )
     )
   order by
     -- primero los que empiezan igual que lo que escribió
     (public.normalizar_nombre(j.nombre) like public.normalizar_nombre(p_texto) || '%') desc,
     j.nombre
   limit 5
$$;
revoke all on function public.buscar_nombres(text) from public;
grant execute on function public.buscar_nombres(text) to anon, authenticated;

-- ============================================================
-- 14. TU CUENTA: CAMBIAR TU NOMBRE Y BORRAR TU CUENTA
--   · El nombre cambia en tu perfil y en tu ficha de la lista, juntos.
--   · Borrar la cuenta quita el acceso, el correo y el teléfono.
--     La ficha (nombre, asistencia, cooperaciones) se queda: las cuentas del
--     grupo no pueden quedar con hoyos. Si regresa, se registra y toca "Soy yo".
-- ============================================================
create or replace function public.cambiar_mi_nombre(p_nombre text)
returns void language plpgsql security definer set search_path = public as $$
declare v text := regexp_replace(trim(coalesce(p_nombre, '')), '\s+', ' ', 'g');
begin
  if auth.uid() is null then raise exception 'Inicia sesión primero.'; end if;
  if coalesce(array_length(string_to_array(v, ' '), 1), 0) < 2 then
    raise exception 'Escribe tu nombre completo: nombre y al menos un apellido.';
  end if;
  if length(v) > 80 then raise exception 'Ese nombre está demasiado largo.'; end if;
  if exists (select 1 from public.jovenes
              where lower(trim(nombre)) = lower(v) and perfil_id is distinct from auth.uid()) then
    raise exception 'Ya hay alguien con ese nombre en la lista. Si eres tú, pídele al encargado de asistencia que junte las fichas.';
  end if;
  update public.perfiles set nombre = v where id = auth.uid();
  update public.jovenes  set nombre = v where perfil_id = auth.uid();
end $$;
revoke all on function public.cambiar_mi_nombre(text) from public;
grant execute on function public.cambiar_mi_nombre(text) to authenticated;

create or replace function public.borrar_mi_cuenta()
returns void language plpgsql security definer set search_path = public as $$
declare yo uuid := auth.uid();
begin
  if yo is null then raise exception 'Inicia sesión primero.'; end if;
  if exists (select 1 from public.perfiles where id = yo and rol = 'admin')
     and (select count(*) from public.perfiles where rol = 'admin') <= 1 then
    raise exception 'Eres el único admin. Nombra a otro admin antes de borrar tu cuenta.';
  end if;
  -- La ficha se queda sin datos de contacto
  update public.jovenes set email = null, telefono = null, perfil_id = null where perfil_id = yo;
  -- Los movimientos que registró quedan como "registrado por: (cuenta borrada)" sin brincarse el candado a mano
  perform set_config('jovenes.fusion', 'si', true);
  delete from auth.users where id = yo;
end $$;
revoke all on function public.borrar_mi_cuenta() from public;
grant execute on function public.borrar_mi_cuenta() to authenticated;

-- ============================================================
-- 15. CANDADOS Y AVISOS
--   · Asistencia: no se pasa lista en actividades futuras ni canceladas; pasados
--     3 días, solo el encargado de asistencia la puede cambiar.
--   · "Hay que buscarlos" cuenta semanas con culto (con lista pasada) desde que entró.
--   · Fichas que se parecen → aviso al equipo de asistencia para juntarlas.
--   · Quien llega después de abierta una cooperación no queda debiendo: finanzas decide.
--   · Cortes de caja: lo que queda antes de un corte ya no se toca.
-- ============================================================

-- ---------- Fusionar: igual que antes, pero el permiso especial va primero ----------
-- (para que la asistencia vieja pase aunque la lista ya esté cerrada) y las
-- exclusiones automáticas de cooperaciones no se heredan.
alter table public.cooperacion_excluidos add column if not exists automatica boolean not null default false;

create or replace function public.fusionar_jovenes(p_origen uuid, p_destino uuid)
returns void language plpgsql security definer set search_path = public as $$
declare o public.jovenes; d public.jovenes;
begin
  if not public.en_equipo('asistencia') then raise exception 'No tienes permiso para hacer eso.'; end if;
  if p_origen = p_destino then raise exception 'Elige a otra persona.'; end if;
  select * into o from public.jovenes where id = p_origen;
  select * into d from public.jovenes where id = p_destino;
  if o.id is null or d.id is null then raise exception 'No se encontró a uno de los dos.'; end if;
  if o.perfil_id is not null and d.perfil_id is not null then
    raise exception 'Los dos tienen cuenta: no se pueden juntar.';
  end if;

  perform set_config('jovenes.fusion', 'si', true);   -- deja pasar los candados

  insert into public.asistencias (actividad_id, joven_id, marcado_por, created_at)
  select actividad_id, p_destino, marcado_por, created_at from public.asistencias where joven_id = p_origen
  on conflict do nothing;
  insert into public.cooperacion_excluidos (cooperacion_id, joven_id)
  select cooperacion_id, p_destino from public.cooperacion_excluidos where joven_id = p_origen and not automatica
  on conflict do nothing;
  update public.movimientos set joven_id = p_destino where joven_id = p_origen;

  update public.jovenes set perfil_id = null where id = p_origen;
  update public.jovenes set
    perfil_id = coalesce(d.perfil_id, o.perfil_id),
    email     = coalesce(d.email, o.email),
    telefono  = coalesce(d.telefono, o.telefono),
    activo    = d.activo or o.activo
  where id = p_destino;
  delete from public.jovenes where id = p_origen;
end $$;
grant execute on function public.fusionar_jovenes(uuid, uuid) to authenticated;

-- ---------- Candado de asistencia ----------
create or replace function public.candado_asistencia()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r public.asistencias := coalesce(new, old);
  a record;
begin
  if current_setting('jovenes.fusion', true) = 'si' then return r; end if;
  select fecha, cancelada into a from public.actividades where id = r.actividad_id;
  if not found then return r; end if;                                              -- se está borrando la actividad
  if not exists (select 1 from public.jovenes where id = r.joven_id) then return r; end if;   -- se está borrando la ficha
  if a.fecha > public.hoy() then
    raise exception 'Todavía no es el día: la lista se pasa el día de la actividad.';
  end if;
  if a.cancelada then
    raise exception 'Esta actividad está cancelada: no se pasa lista.';
  end if;
  if a.fecha < public.hoy() - 3 and not (public.es_encargado() or public.es_lider('asistencia')) then
    raise exception 'Esta lista ya se cerró (pasaron más de 3 días). Solo el encargado de asistencia la puede cambiar.';
  end if;
  return r;
end $$;
drop trigger if exists asistencias_candado on public.asistencias;
create trigger asistencias_candado before insert or update or delete on public.asistencias
  for each row execute function public.candado_asistencia();

-- ---------- Semanas sin venir (las que cuentan) ----------
-- Semanas en que hubo culto (no cancelado y con lista pasada) después de su última
-- asistencia y desde que entró al grupo. Vacaciones o semanas sin lista no cuentan.
create or replace function public.semanas_sin_venir(p_joven uuid)
returns int language sql stable security definer set search_path = public as $$
  select case when public.en_equipo('asistencia') or p_joven = public.mi_joven_id() then (
    select count(distinct date_trunc('week', act.fecha))::int
      from public.jovenes j
      join public.actividades act
        on act.tipo = 'culto' and not act.cancelada and act.fecha <= public.hoy()
       and act.fecha >= (j.created_at at time zone 'America/Merida')::date
       and act.fecha > coalesce((
             select max(a2.fecha) from public.asistencias s
               join public.actividades a2 on a2.id = s.actividad_id
              where s.joven_id = j.id and not a2.cancelada), '-infinity'::date)
     where j.id = p_joven
       and exists (select 1 from public.asistencias s where s.actividad_id = act.id)
  ) end
$$;
revoke all on function public.semanas_sin_venir(uuid) from public;
grant execute on function public.semanas_sin_venir(uuid) to authenticated;

drop function if exists public.resumen_jovenes(int);
create function public.resumen_jovenes(p_semanas int default 8)
returns table (joven_id uuid, nombre text, activo boolean, recientes int, total int, ultima date, semanas_falta int)
language sql stable security invoker set search_path = public as $$
  select j.id, j.nombre, j.activo,
         count(act.id) filter (where act.fecha >= public.hoy() - p_semanas * 7)::int,
         count(act.id)::int,
         max(act.fecha),
         coalesce(public.semanas_sin_venir(j.id), 0)
    from public.jovenes j
    left join public.asistencias a on a.joven_id = j.id
    left join public.actividades act on act.id = a.actividad_id and act.fecha <= public.hoy() and not act.cancelada
   where not exists (select 1 from public.perfiles p where p.id = j.perfil_id and p.rol = 'admin')
   group by j.id, j.nombre, j.activo
$$;
grant execute on function public.resumen_jovenes(int) to authenticated;

-- ---------- Fichas que se parecen ----------
-- "Juan López" y "Juan Carlos López Pérez" → posible repetido.
-- Si el encargado dice que son distintas, ya no se vuelve a avisar.
create table if not exists public.fichas_distintas (
  a uuid not null references public.jovenes (id) on delete cascade,
  b uuid not null references public.jovenes (id) on delete cascade,
  primary key (a, b),
  check (a < b)
);
alter table public.fichas_distintas enable row level security;
drop policy if exists "distintas_asistencia" on public.fichas_distintas;
create policy "distintas_asistencia" on public.fichas_distintas for all to authenticated
  using (public.en_equipo('asistencia')) with check (public.en_equipo('asistencia'));
grant select, insert, delete on public.fichas_distintas to authenticated;

create or replace function public.palabras_nombre(t text)
returns text[] language sql immutable as $$
  select array(
    select w from unnest(string_to_array(public.normalizar_nombre(regexp_replace(coalesce(t, ''), '[()]', '', 'g')), ' ')) w
     where w <> '' and w not in ('de', 'del', 'la', 'las', 'los', 'y', 'e'))
$$;

create or replace function public.posibles_repetidos()
returns table (a uuid, nombre_a text, cuenta_a boolean, b uuid, nombre_b text, cuenta_b boolean)
language sql stable security definer set search_path = public as $$
  with f as (
    select id, nombre, perfil_id is not null as cuenta, public.palabras_nombre(nombre) as p
      from public.jovenes
     where public.en_equipo('asistencia')
  )
  select x.id, x.nombre, x.cuenta, y.id, y.nombre, y.cuenta
    from f x join f y on x.id < y.id
   where cardinality(x.p) >= 2 and cardinality(y.p) >= 2
     and (x.p <@ y.p or y.p <@ x.p                       -- uno trae todas las palabras del otro
          or (x.p[1] = y.p[1] and x.p[2] = y.p[2]))       -- mismo nombre y primer apellido
     and not (x.cuenta and y.cuenta)                      -- dos cuentas no se pueden juntar
     and not exists (select 1 from public.fichas_distintas d where d.a = x.id and d.b = y.id)
   order by x.nombre, y.nombre
$$;
revoke all on function public.posibles_repetidos() from public;
grant execute on function public.posibles_repetidos() to authenticated;

-- ---------- Cooperaciones: los que llegan después ----------
-- Una ficha nueva (alguien que se registra o se agrega) entra como "No aplica"
-- en las cooperaciones que ya estaban abiertas. Finanzas le pone "Sí aplica" si le toca.
create or replace function public.llegan_despues()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.cooperacion_excluidos (cooperacion_id, joven_id, automatica)
  select c.id, new.id, true from public.cooperaciones c where not c.cerrada
  on conflict do nothing;
  return new;
end $$;
drop trigger if exists jovenes_llegan_despues on public.jovenes;
create trigger jovenes_llegan_despues after insert on public.jovenes
  for each row execute function public.llegan_despues();

-- ---------- Cortes de caja ----------
create table if not exists public.cortes (
  id         uuid primary key default gen_random_uuid(),
  hasta      date not null unique,
  entradas   numeric(12,2) not null,   -- del periodo (desde el corte anterior)
  salidas    numeric(12,2) not null,
  saldo      numeric(12,2) not null,   -- acumulado al cierre
  notas      text,
  hecho_por  uuid references public.perfiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.cortes enable row level security;
drop policy if exists "cortes_leer" on public.cortes;
create policy "cortes_leer" on public.cortes for select to authenticated using (public.en_equipo('finanzas'));
grant select on public.cortes to authenticated;

create or replace function public.hacer_corte(p_hasta date, p_notas text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare antes date; v uuid;
begin
  if not public.en_equipo('finanzas') then raise exception 'Solo el equipo de finanzas hace cortes.'; end if;
  if p_hasta is null or p_hasta > public.hoy() then raise exception 'El corte tiene que ser de hoy o de un día que ya pasó.'; end if;
  select max(hasta) into antes from public.cortes;
  if antes is not null and p_hasta <= antes then
    raise exception 'Ya hay un corte al %. El nuevo tiene que ser de después.', to_char(antes, 'DD/MM/YYYY');
  end if;
  insert into public.cortes (hasta, entradas, salidas, saldo, notas)
  select p_hasta,
         coalesce(sum(monto) filter (where tipo = 'entrada' and fecha > coalesce(antes, '-infinity'::date)), 0),
         coalesce(sum(monto) filter (where tipo = 'salida'  and fecha > coalesce(antes, '-infinity'::date)), 0),
         coalesce(sum(case when tipo = 'entrada' then monto else -monto end), 0),
         nullif(trim(coalesce(p_notas, '')), '')
    from public.movimientos
   where not anulado and fecha <= p_hasta
  returning id into v;
  return v;
end $$;

-- Por si se equivocaron: solo un admin, y solo el último
create or replace function public.deshacer_corte(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.es_admin() then raise exception 'Solo un admin puede deshacer un corte.'; end if;
  if p_id is distinct from (select id from public.cortes order by hasta desc limit 1) then
    raise exception 'Solo se puede deshacer el último corte.';
  end if;
  delete from public.cortes where id = p_id;
end $$;
revoke all on function public.hacer_corte(date, text), public.deshacer_corte(uuid) from public;
grant execute on function public.hacer_corte(date, text), public.deshacer_corte(uuid) to authenticated;

create or replace function public.candado_cortes()
returns trigger language plpgsql security definer set search_path = public as $$
declare h date;
begin
  if current_setting('jovenes.fusion', true) = 'si' then return new; end if;
  select max(hasta) into h from public.cortes;
  if h is null then return new; end if;
  if tg_op = 'INSERT' and new.fecha <= h then
    raise exception 'Ese periodo ya está cerrado (corte al %). Regístralo con una fecha posterior.', to_char(h, 'DD/MM/YYYY');
  end if;
  if tg_op = 'UPDATE' and old.fecha <= h and new.anulado and not old.anulado then
    raise exception 'Ese movimiento es de un periodo cerrado (corte al %). No se anula: registra un ajuste con fecha de hoy.', to_char(h, 'DD/MM/YYYY');
  end if;
  return new;
end $$;
drop trigger if exists movimientos_cortes on public.movimientos;
create trigger movimientos_cortes before insert or update on public.movimientos
  for each row execute function public.candado_cortes();
