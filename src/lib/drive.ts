import "server-only";
import { unstable_cache } from "next/cache";

/*
 * Google Drive del grupo. Se entra con la cuenta de Google del grupo
 * (refresh token guardado en variables de entorno, nunca en el navegador).
 *
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
 *   DRIVE_CARPETA_ID  → la carpeta "Evidencias" donde se suben las fotos
 *
 * Las fotos se suben a esa carpeta (o a subcarpetas, un nivel o dos) desde
 * la app de Drive, como siempre. Los tickets de finanzas van en "Tickets".
 */

const API = "https://www.googleapis.com/drive/v3";
const CARPETA_TICKETS = "Tickets";
const TZ = "America/Merida";

export const driveListo = () =>
  !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET &&
     process.env.GOOGLE_REFRESH_TOKEN && process.env.DRIVE_CARPETA_ID);

const raiz = () => process.env.DRIVE_CARPETA_ID!;

/** Carpeta compartida donde el equipo sube las fotos (se puede cambiar con DRIVE_ENLACE_SUBIR). */
export const ENLACE_SUBIR_FOTOS =
  process.env.DRIVE_ENLACE_SUBIR || "https://drive.google.com/drive/folders/1Jvh2LyaAiv5lRojTSCjbU9-RhbiR77n7?usp=sharing";

// ---------- Token (se renueva solo, dura ~1 hora) ----------
let token: { valor: string; vence: number } | null = null;

export async function tokenDrive(): Promise<string> {
  if (token && token.vence > Date.now() + 60_000) return token.valor;
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error("Drive no dejó entrar. Revisa GOOGLE_REFRESH_TOKEN.");
  const j = (await r.json()) as { access_token: string; expires_in: number };
  token = { valor: j.access_token, vence: Date.now() + j.expires_in * 1000 };
  return token.valor;
}

async function drive<T>(ruta: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API}${ruta}`, {
    ...init,
    headers: { Authorization: `Bearer ${await tokenDrive()}`, ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Drive respondió ${r.status}`);
  return r.json() as Promise<T>;
}

type Archivo = {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  parents?: string[];
  imageMediaMetadata?: { time?: string };
};

async function listar(q: string): Promise<Archivo[]> {
  const todos: Archivo[] = [];
  let pagina: string | undefined;
  do {
    const p = new URLSearchParams({
      q,
      pageSize: "1000",
      fields: "nextPageToken, files(id, name, mimeType, createdTime, parents, imageMediaMetadata(time))",
      ...(pagina ? { pageToken: pagina } : {}),
    });
    const j = await drive<{ files: Archivo[]; nextPageToken?: string }>(`/files?${p}`);
    todos.push(...j.files);
    pagina = j.nextPageToken;
  } while (pagina);
  return todos;
}

const CARPETA = "application/vnd.google-apps.folder";

/** Carpeta raíz + subcarpetas (hasta 2 niveles), sin "Tickets". */
async function carpetasDeFotos(): Promise<string[]> {
  const ids = [raiz()];
  let nivel = [raiz()];
  for (let i = 0; i < 2 && nivel.length; i++) {
    const q = `(${nivel.map((id) => `'${id}' in parents`).join(" or ")}) and mimeType = '${CARPETA}' and trashed = false`;
    const hijas = (await listar(q)).filter((c) => c.name !== CARPETA_TICKETS);
    nivel = hijas.map((c) => c.id);
    ids.push(...nivel);
  }
  return ids;
}

// ---------- Fotos ----------
export type Foto = { id: string; nombre: string; fecha: string; hora: string | null };

const fechaMerida = (iso: string) => {
  const d = new Date(iso);
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const h = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hour12: false }).format(d);
  return { fecha: f, hora: h };
};

/**
 * Fecha de cada foto: la de la cámara (EXIF, "2026:11:08 19:42:10") y, si no trae
 * (fotos de WhatsApp, capturas), la fecha en que se subió a Drive.
 */
function cuando(a: Archivo): { fecha: string; hora: string | null } {
  const t = a.imageMediaMetadata?.time;
  const m = t?.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2})/);
  if (m && m[1] !== "0000") return { fecha: `${m[1]}-${m[2]}-${m[3]}`, hora: `${m[4]}:${m[5]}` };
  return fechaMerida(a.createdTime);
}

async function leerFotos(): Promise<Foto[]> {
  const carpetas = await carpetasDeFotos();
  const fotos: Foto[] = [];
  // Drive limita lo largo de la consulta: de 20 en 20 carpetas
  for (let i = 0; i < carpetas.length; i += 20) {
    const grupo = carpetas.slice(i, i + 20);
    const q = `(${grupo.map((id) => `'${id}' in parents`).join(" or ")}) and mimeType contains 'image/' and trashed = false`;
    for (const a of await listar(q)) fotos.push({ id: a.id, nombre: a.name, ...cuando(a) });
  }
  return fotos.sort((a, b) => (a.fecha + (a.hora ?? "")).localeCompare(b.fecha + (b.hora ?? "")));
}

/** Todas las fotos (se vuelve a preguntar a Drive cada 5 minutos). */
export const fotosDrive = unstable_cache(leerFotos, ["fotos-drive"], { revalidate: 300, tags: ["fotos"] });

// ---------- Fotos ↔ actividades ----------
type ActividadMin = { id: string; fecha: string; hora: string | null; hora_fin?: string | null };

const minutos = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
/** Margen: media hora antes de empezar; hasta una hora después de terminar (o 3 h si no dice cuándo termina). */
const ANTES = 30, DESPUES = 60, DURACION = 180;

/** ¿La foto cae en el horario de la actividad? */
function cabe(a: ActividadMin, f: Foto, delDia: number): boolean {
  if (!a.hora) return true;                       // actividad sin hora: todo el día
  if (!f.hora) return delDia === 1;               // foto sin hora: solo si ese día hubo una sola
  const ini = minutos(a.hora) - ANTES;
  const fin = (a.hora_fin ? minutos(a.hora_fin) : minutos(a.hora) + DURACION) + DESPUES;
  const m = minutos(f.hora);
  return m >= ini && m <= fin;
}

/**
 * Cada foto va a la actividad de su día cuyo horario la incluya (si caben en
 * varias, a la que empezó más tarde antes de la foto). Las que no caen en
 * ningún horario quedan "sin asignar": nada de pegarlas a la más cercana.
 */
export function repartir<A extends ActividadMin>(fotos: Foto[], actividades: A[]) {
  const porDia = new Map<string, A[]>();
  for (const a of actividades) porDia.set(a.fecha, [...(porDia.get(a.fecha) ?? []), a]);
  const album = new Map<string, Foto[]>();
  const sueltas: Foto[] = [];
  for (const f of fotos) {
    const delDia = porDia.get(f.fecha) ?? [];
    const caben = delDia.filter((a) => cabe(a, f, delDia.length));
    if (!caben.length) { sueltas.push(f); continue; }
    const conHora = caben.filter((a) => a.hora).sort((a, b) => a.hora!.localeCompare(b.hora!));
    const elegida = (f.hora ? conHora.filter((a) => a.hora!.slice(0, 5) <= f.hora!).at(-1) : undefined) ?? conHora[0] ?? caben[0];
    album.set(elegida.id, [...(album.get(elegida.id) ?? []), f]);
  }
  return { album, sueltas };
}

// ---------- Espacio ----------
export const espacioDrive = unstable_cache(
  async () => {
    const j = await drive<{ storageQuota: { limit?: string; usage: string } }>("/about?fields=storageQuota");
    return { usado: Number(j.storageQuota.usage), limite: j.storageQuota.limit ? Number(j.storageQuota.limit) : null };
  },
  ["espacio-drive"],
  { revalidate: 3600 },
);

// ---------- Seguridad del visor ----------
const permitidos = new Map<string, boolean>();

/** Solo se sirven archivos que vivan dentro de la carpeta del grupo (hasta 3 niveles). */
export async function dentroDeLaCarpeta(id: string): Promise<boolean> {
  if (permitidos.has(id)) return permitidos.get(id)!;
  let actual = [id];
  let ok = false;
  for (let i = 0; i < 4 && actual.length && !ok; i++) {
    const padres = (await Promise.all(actual.map((x) =>
      drive<{ parents?: string[] }>(`/files/${x}?fields=parents`).then((r) => r.parents ?? []).catch(() => []),
    ))).flat();
    ok = padres.includes(raiz());
    actual = padres;
  }
  permitidos.set(id, ok);
  return ok;
}

/** Descarga una imagen: completa o en miniatura (lado mayor = tam px). */
export async function imagenDrive(id: string, tam?: number): Promise<Response> {
  const t = await tokenDrive();
  if (tam) {
    const meta = await drive<{ thumbnailLink?: string }>(`/files/${id}?fields=thumbnailLink`);
    if (meta.thumbnailLink) {
      const url = meta.thumbnailLink.replace(/=s\d+$/, `=s${tam}`);
      const r = await fetch(url, { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" });
      if (r.ok) return r;
    }
  }
  return fetch(`${API}/files/${id}?alt=media`, { headers: { Authorization: `Bearer ${t}` }, cache: "no-store" });
}

// ---------- Tickets ----------
let carpetaTickets: string | null = null;

async function idCarpetaTickets(): Promise<string> {
  if (carpetaTickets) return carpetaTickets;
  const q = `name = '${CARPETA_TICKETS}' and mimeType = '${CARPETA}' and '${raiz()}' in parents and trashed = false`;
  const [hay] = await listar(q);
  if (hay) return (carpetaTickets = hay.id);
  const nueva = await drive<{ id: string }>("/files?fields=id", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: CARPETA_TICKETS, mimeType: CARPETA, parents: [raiz()] }),
  });
  return (carpetaTickets = nueva.id);
}

/** Sube la foto de un ticket a Evidencias/Tickets y regresa su id de Drive. */
export async function subirTicket(archivo: File, nombre: string): Promise<string> {
  const carpeta = await idCarpetaTickets();
  const limite = `jovenes${Date.now()}`;
  const meta = JSON.stringify({ name: nombre, parents: [carpeta] });
  const cuerpo = new Blob([
    `--${limite}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`,
    `--${limite}\r\nContent-Type: ${archivo.type || "image/jpeg"}\r\n\r\n`,
    await archivo.arrayBuffer(),
    `\r\n--${limite}--`,
  ]);
  const r = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: { Authorization: `Bearer ${await tokenDrive()}`, "Content-Type": `multipart/related; boundary=${limite}` },
    body: cuerpo,
  });
  if (!r.ok) {
    if (r.status === 403) throw new Error("El Drive del grupo está lleno o no dejó subir el ticket.");
    throw new Error("No se pudo subir el ticket a Drive.");
  }
  return ((await r.json()) as { id: string }).id;
}
