# Jóvenes

App del grupo de jóvenes de La Luz del Mundo, Colonia Sambulá. Reemplaza la lista en
papel, la libreta del dinero y las fotos regadas en WhatsApp.

**Stack:** Next.js 16 (App Router) · Supabase (Auth + Postgres + RLS) · Tailwind 4
(mismo login y diseño que el Itinerario).

## Fases

- [x] **1. Actividades y asistencia**: calendario, lista de jóvenes, pase de lista discreto y "hay que buscarlos".
- [x] **2. Finanzas**: entradas, salidas, cooperaciones, ventas y reportes. Nada se borra, solo se anula.
- [x] **3. Evidencias y panel**: fotos en Google Drive ordenadas por actividad y fecha; resumen para encargados.

## Cómo funciona

| Concepto | Tabla | Ejemplo |
|---|---|---|
| Cuenta | `perfiles` | Andy · admin · equipos: asistencia |
| Joven del grupo | `jovenes` | Ana López (puede no tener cuenta) |
| Actividad | `actividades` | Culto juvenil · sáb 8 nov · 7:30 p. m. |
| Asistencia | `asistencias` | Ana vino al culto del 8 nov |
| Dinero | `movimientos` | Salida · Compra · Masa y hojas · $780 · Venta de tamales |
| Cooperación | `cooperaciones` (+ `cooperacion_excluidos`) | Retiro · $100 por persona |

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

## Finanzas

- Cada entrada o salida es un renglón en `movimientos`, opcionalmente ligado a una actividad
  (así cada venta muestra cuánto se invirtió, cuánto entró y cuánto se ganó).
- **Nada se borra ni se edita.** Un trigger (`proteger_movimientos`) solo deja **anular**, una vez,
  con motivo; queda guardado quién y cuándo. Lo anulado sale tachado y no cuenta en el saldo.
- Una **cooperación** fija cuánto da cada joven activo. Cada pago es una entrada con `cooperacion_id`
  y `joven_id`; a quien no le toca se le marca "No aplica". Cada joven ve en su inicio lo que le falta.
- `saldo()`, `estado_cooperacion(id)` y `mis_cooperaciones()` hacen las cuentas en la base.

## Evidencias (Google Drive)

Las fotos **no** se guardan en Supabase: viven en la carpeta **Evidencias** del Drive del grupo.
El equipo de evidencias las sube con la app de Drive, como siempre, y la app:

- Lee la carpeta (y sus subcarpetas) cada 5 minutos.
- Acomoda cada foto en la actividad de su día, usando la fecha de la cámara; si la foto no la
  trae (WhatsApp, capturas), usa la fecha en que se subió. Si ese día hubo dos actividades, va a
  la que empezó más cerca antes de la hora de la foto.
- Las muestra por `/api/foto/ID`: el navegador nunca habla con Drive, solo entra quien tiene
  cuenta, y solo se sirven archivos que estén dentro de la carpeta Evidencias.
- Avisa cuando el Drive pasa del 75 % y del 90 %.

Los tickets de finanzas se suben desde la app (ya achicados en el celular) a `Evidencias/Tickets`.

## Panel (`/panel`, encargados)

Promedio por culto, jóvenes activos, saldo, fotos del mes, gráfica de jóvenes por semana
(8 semanas), a quién hay que buscar, cooperaciones abiertas y aviso del espacio del Drive.

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

## Conectar el Drive

Todo con la **cuenta de Google del grupo** (no la personal de nadie).

1. **Drive:** crea la carpeta `Evidencias`. Ábrela y copia el ID de la URL
   (`drive.google.com/drive/folders/ESTE_ES_EL_ID`). Compártela como *Editor* con el equipo de evidencias.
2. **Google Cloud Console → nuevo proyecto → APIs y servicios → Biblioteca:** habilita **Google Drive API**.
3. **Pantalla de consentimiento de OAuth:** tipo *Externo*, nombre de la app y correo. Al terminar,
   en *Público* dale **Publicar app** (modo producción). Si se queda en "Prueba", el token deja de
   servir a los 7 días.
4. **Credenciales → Crear ID de cliente de OAuth → Aplicación web.** En *URI de redireccionamiento
   autorizados* pon `https://developers.google.com/oauthplayground`. Copia el *Client ID* y el *Client secret*.
5. **developers.google.com/oauthplayground:** engrane ⚙️ → *Use your own OAuth credentials* → pega
   ID y secret. En *Step 1* escribe el scope `https://www.googleapis.com/auth/drive` → *Authorize APIs*
   → entra con la cuenta del grupo (si dice "Google no verificó esta app": *Avanzado → Ir a…*).
   En *Step 2* → *Exchange authorization code for tokens* → copia el **Refresh token**.
6. **Vercel → Settings → Environment Variables:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
   `GOOGLE_REFRESH_TOKEN`, `DRIVE_CARPETA_ID`. Luego **Redeploy**.

Sin esas variables la app funciona igual; Evidencias solo muestra que falta conectar el Drive.
