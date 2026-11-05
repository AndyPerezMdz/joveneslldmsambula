import { partesFecha } from "@/lib/fechas";

/** Línea de jóvenes por semana, dibujada a escala. */
export function GraficaSemanas({ semanas, serie }: { semanas: string[]; serie: number[] }) {
  const n = serie.length;
  if (n < 2) return null;
  const W = 560, H = 170, IZQ = 28, DER = 12, ARR = 22, ABA = 26;
  const max = Math.max(4, ...serie);
  const tope = Math.ceil(max / 4) * 4;
  const x = (i: number) => IZQ + (i * (W - IZQ - DER)) / (n - 1);
  const y = (v: number) => H - ABA - (v / tope) * (H - ARR - ABA);
  const linea = serie.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const ult = n - 1;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Jóvenes por semana: ${serie.join(", ")}`}>
      {[0, tope / 2, tope].map((v) => (
        <g key={v}>
          <line x1={IZQ} x2={W - DER} y1={y(v)} y2={y(v)} stroke="currentColor" className="text-stone-200" />
          <text x={IZQ - 6} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill="currentColor" className="text-stone-400">{v}</text>
        </g>
      ))}
      {semanas.map((s, i) => (i % 2 === ult % 2) && (
        <text key={s} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="currentColor" className="text-stone-400">
          {partesFecha(s).dia} {partesFecha(s).mes}
        </text>
      ))}
      <path d={`${linea} L${x(ult)} ${y(0)} L${x(0)} ${y(0)} Z`} fill="currentColor" className="text-marca-claro" opacity="0.8" />
      <path d={linea} fill="none" stroke="currentColor" className="text-marca-medio" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {serie.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={i === ult ? 5 : 2.5} fill="currentColor" className={i === ult ? "text-oro" : "text-marca-medio"} />
      ))}
      <text x={x(ult) - 8} y={y(serie[ult]) - 10} textAnchor="end" fontSize="12" fontWeight="600" fill="currentColor" className="text-titulo">
        {serie[ult]} esta semana
      </text>
    </svg>
  );
}
