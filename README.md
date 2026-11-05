# Jóvenes

App del grupo de jóvenes de La Luz del Mundo, Colonia Sambulá. Reemplaza la lista en
papel, la libreta del dinero y las fotos regadas en WhatsApp.

**Stack:** Next.js 16 (App Router) · Supabase (Auth + Postgres + RLS) · Tailwind 4
(mismo login y diseño que el Itinerario).

## Fases

- [x] **1. Actividades y asistencia**: calendario, lista de jóvenes, pase de lista discreto y "hay que buscarlos".
- [ ] **2. Finanzas**: entradas, salidas, cooperaciones, ventas y reportes. Nada se borra, solo se anula.
- [ ] **3. Evidencias y panel**: fotos en Google Drive ordenadas por actividad y fecha; resumen para encargados.

## Cómo funciona

| Concepto | Tabla | Ejemplo |
|---|---|---|
| Cuenta | `perfiles` | Andy · admin · equipos: asistencia |
| Joven del grupo | `jovenes` | Ana López (puede no tener cuenta) |
| Actividad | `actividades` | Culto juvenil · sáb 8 nov · 7:30 p. m. |
| Asistencia | `asistencias` | Ana vino al culto del 8 nov |

`resumen_jovenes(semanas)` regresa, por joven, cuántas veces vino en las últimas N semanas,
cuántas en total y la fecha de la última. Con eso se ordena el pase de lista (los que vienen
seguido arriba) y se arma la alerta de quién lleva 3 semanas o más sin venir.

**Permisos (RLS):**

| Rol | Qué puede hacer |
|---|---|
| `admin` | Todo, más la pantalla **Equipo** (roles y equipos de cada cuenta). Los correos de `correos_admin` entran como admin solos. |
| `encargado` | Todo lo de todos los equipos. |
| `joven` | Ve las actividades y **su** asistencia. Si está en un equipo, además lo de ese equipo. |

Equipos (`perfiles.equipos`, puede tener varios): `asistencia` (pasa lista, mantiene la lista de jóvenes),
`finanzas`, `evidencias`. Cualquiera que esté en un equipo puede crear actividades.

## Pase de lista

Se marca con un toque y se guarda en segundo plano. Si no hay internet, los cambios se quedan
en el celular y se mandan solos cuando regresa la señal. Si llega alguien nuevo, se agrega
desde la misma pantalla y queda marcado.

## Puesta en marcha

1. **Supabase → SQL Editor:** pega y corre `supabase/jovenes.sql`. Es toda la base en un solo archivo y se puede correr las veces que quieras.
2. **Auth → URL Configuration:** Site URL = tu dominio (o `http://localhost:3000`).
3. **Auth → Email Templates → Confirm signup:** el link debe ser
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
4. **Correos** (ver abajo).
5. Regístrate en `/registro`. Si tu correo está en `correos_admin`, ya entras como admin.
6. Local:
   ```powershell
   Copy-Item .env.example .env.local   # pon URL y publishable key
   npm install
   npm run dev
   ```

## Base de datos

Todo vive en **`supabase/jovenes.sql`**. Cuando algo cambie, se edita ese archivo y se vuelve a
correr completo en el SQL Editor.


## Correos

Salen por **Resend** desde `laagendita.app` (Supabase → Authentication → Emails → SMTP Settings:
host `smtp.resend.com`, puerto `465`, usuario `resend`, contraseña = API key de Resend).

Las plantillas están en `supabase/correos/`. Cada archivo dice arriba en qué plantilla de
Supabase va y qué asunto lleva; se pega el HTML completo.

| Archivo | Plantilla en Supabase |
|---|---|
| `confirmar-registro.html` | Confirm signup |
| `restablecer-contrasena.html` | Reset password |
