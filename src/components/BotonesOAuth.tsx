import { entrarCon } from "@/app/login/oauth";
import { ui } from "@/lib/ui";

/** "Continuar con Google / Apple". Sin contraseñas ni correos de confirmación. */
export function BotonesOAuth({ next = "/" }: { next?: string }) {
  return (
    <div className="space-y-2.5">
      <form action={entrarCon}>
        <input type="hidden" name="proveedor" value="google" />
        <input type="hidden" name="next" value={next} />
        <button className={`${ui.btnSec} w-full`}>
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
            <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.7z" />
            <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
            <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8l4-3.1z" />
            <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
          </svg>
          Continuar con Google
        </button>
      </form>
      <form action={entrarCon}>
        <input type="hidden" name="proveedor" value="apple" />
        <input type="hidden" name="next" value={next} />
        <button className={`${ui.btnSec} w-full`}>
          <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden="true">
            <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.8 1.2 1.8 2.6 3.1 2.6 1.3-.1 1.7-.8 3.3-.8 1.5 0 1.9.8 3.3.8 1.4 0 2.2-1.3 3-2.5 1-1.4 1.4-2.8 1.4-2.8 0 0-2.7-1-2.7-4.2zM13.9 4.9c.7-.9 1.2-2 1-3.2-1 0-2.2.7-3 1.6-.6.7-1.2 1.9-1 3.1 1.1 0 2.3-.6 3-1.5z" />
          </svg>
          Continuar con Apple
        </button>
      </form>
      <div className="flex items-center gap-3 py-2 text-xs uppercase tracking-wider text-stone-400">
        <span className="h-px flex-1 bg-stone-200" />o con correo<span className="h-px flex-1 bg-stone-200" />
      </div>
    </div>
  );
}
