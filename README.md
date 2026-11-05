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
4. **Google y Apple** (ver abajo). Si no los configuras, los botones dan error pero el correo sigue funcionando.
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

## Entrar con Google y Apple

En **Supabase → Auth → URL Configuration → Redirect URLs** agrega:
`https://TU-DOMINIO/auth/callback` y `http://localhost:3000/auth/callback`.

**Google:** Google Cloud Console → APIs y servicios → Credenciales → Crear ID de cliente OAuth
(Aplicación web). En *URI de redireccionamiento autorizados* pon el callback de Supabase
(`https://<proyecto>.supabase.co/auth/v1/callback`). Pega Client ID y Secret en
Supabase → Auth → Sign In / Providers → Google.

**Apple:** necesita cuenta de Apple Developer (de paga). Crea un Services ID con
"Sign in with Apple", pon el mismo callback de Supabase como Return URL, genera la
llave (.p8) y pega todo en Supabase → Auth → Sign In / Providers → Apple.
Apple a veces no manda el nombre: se corrige en **Equipo**.
