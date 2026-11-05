// Service worker de la app de jóvenes.
// - Archivos de la app (_next/static, íconos): se guardan y se sirven sin internet.
// - Páginas: siempre se piden a internet; si no hay, se usa la última copia guardada
//   (así el pase de lista abre aunque en el templo no haya señal).
// - Nada de Supabase ni de otros sitios pasa por aquí.
const VERSION = "v1";
const ESTATICOS = `estaticos-${VERSION}`;
const PAGINAS = `paginas-${VERSION}`;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (!k.endsWith(VERSION)) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/auth") || url.pathname.startsWith("/api/")) return;

  // Archivos que no cambian (llevan hash en el nombre)
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/iconos/") || /\.(png|webp|svg|woff2?)$/.test(url.pathname)) {
    e.respondWith((async () => {
      const c = await caches.open(ESTATICOS);
      const hay = await c.match(req);
      if (hay) return hay;
      const r = await fetch(req);
      if (r.ok) c.put(req, r.clone());
      return r;
    })());
    return;
  }

  // Navegación entre páginas
  if (req.mode === "navigate") {
    e.respondWith((async () => {
      const c = await caches.open(PAGINAS);
      try {
        const r = await fetch(req);
        if (r.ok && !r.redirected) c.put(req, r.clone());
        return r;
      } catch {
        return (await c.match(req)) || (await c.match("/")) || new Response(
          "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'>" +
          "<body style='font-family:system-ui;background:#0a3156;color:#fff;display:grid;place-items:center;height:100vh;margin:0;text-align:center'>" +
          "<div><h1 style='font-weight:600'>Sin internet</h1><p>Abre esta página una vez con señal y después ya funciona sin ella.</p></div>",
          { headers: { "Content-Type": "text/html; charset=utf-8" } },
        );
      }
    })());
  }
});
