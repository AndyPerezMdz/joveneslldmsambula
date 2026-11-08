import Link from "next/link";

export const metadata = { title: "Aviso de privacidad" };

// Página pública (Google la pide para conectar el Drive del grupo).
export default function Privacidad() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/login" className="text-sm text-stone-500 hover:text-titulo">← Entrar</Link>
      <h1 className="titulo mt-4 text-3xl font-semibold text-titulo">Aviso de privacidad</h1>
      <p className="mt-1 text-sm text-stone-500">App del grupo de jóvenes · La Luz del Mundo, Colonia Sambulá, Mérida, Yucatán</p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed">
        <section>
          <h2 className="font-semibold text-titulo">Qué guardamos</h2>
          <p className="mt-1">Nombre, correo y, si se da, teléfono de cada joven; su asistencia a las actividades
            del grupo; los movimientos de dinero del grupo y las cooperaciones de cada quien.</p>
        </section>
        <section>
          <h2 className="font-semibold text-titulo">Fotos</h2>
          <p className="mt-1">Las fotos de las actividades se guardan en la cuenta de Google Drive del grupo
            (jovenessambula@gmail.com). La app solo las lee para mostrarlas, y los tickets de compras se
            guardan en esa misma cuenta. Solo las ven personas con cuenta en la app.</p>
        </section>
        <section>
          <h2 className="font-semibold text-titulo">Quién lo ve</h2>
          <p className="mt-1">Los encargados del grupo y los equipos de asistencia, finanzas y evidencias, cada
            uno solo lo que le toca. Cada joven ve su propia asistencia y lo que le falta cooperar.
            No vendemos ni compartimos esta información con nadie fuera del grupo.</p>
        </section>
        <section>
          <h2 className="font-semibold text-titulo">Acceso a Google Drive</h2>
          <p className="mt-1">La app usa el permiso de Google Drive únicamente sobre la cuenta del grupo, para
            leer la carpeta de evidencias y guardar tickets. No pide ni usa el Drive de los usuarios.</p>
        </section>
        <section>
          <h2 className="font-semibold text-titulo">Borrar tus datos</h2>
          <p className="mt-1">Puedes borrar tu cuenta tú mismo en <b>Mi cuenta</b>: se borran tu acceso, tu correo y tu
            teléfono. Tu nombre, asistencia y cooperaciones se quedan en los registros del grupo. Si quieres que se
            borre algo más o tus fotos, pídelo a los encargados o escribe a jovenessambula@gmail.com.</p>
        </section>
      </div>
    </main>
  );
}
