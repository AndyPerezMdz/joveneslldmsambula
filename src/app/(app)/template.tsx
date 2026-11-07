/**
 * Se vuelve a montar en cada cambio de página (a diferencia del layout),
 * así que cada pantalla entra con una transición suave.
 */
export default function Transicion({ children }: { children: React.ReactNode }) {
  return <div className="animar-pagina">{children}</div>;
}
