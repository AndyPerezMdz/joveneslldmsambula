// Íconos de línea (24×24, heredan el color del texto).
const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
type P = { className?: string };

export const IcInicio = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20h5v-6h4v6h5V9.5" /></svg>
);
export const IcActividades = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><rect x="3" y="4.5" width="18" height="16" rx="3" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /></svg>
);
export const IcJovenes = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.3-5.5 6.5-5.5s5.9 1.9 6.5 5.5" /><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.8c1.7.7 2.7 2.4 3 5.2" /></svg>
);
export const IcFinanzas = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><rect x="2.5" y="6" width="19" height="14" rx="3" /><path d="M2.5 10h19M16.5 15h1.5" /><path d="M6 6V5a2 2 0 0 1 2-2h8" /></svg>
);
export const IcEvidencias = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><rect x="3" y="3.5" width="18" height="17" rx="3" /><circle cx="9" cy="9.5" r="1.8" /><path d="m21 16-5.5-5.5L5 20.5" /></svg>
);
export const IcReportes = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z" /><path d="M14 2.5V8h5.5M8.5 17v-3M12 17v-6M15.5 17v-4.5" /></svg>
);
export const IcEquipo = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M12 2.5 4 5.5v6c0 5 3.4 8.6 8 10 4.6-1.4 8-5 8-10v-6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
);
export const IcMas = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><circle cx="5" cy="12" r="1.3" /><circle cx="12" cy="12" r="1.3" /><circle cx="19" cy="12" r="1.3" /></svg>
);
export const IcSalir = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M15 3.5h3.5a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H15" /><path d="M10 16.5 14.5 12 10 7.5M14.5 12H3.5" /></svg>
);
export const IcMas2 = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M12 5v14M5 12h14" /></svg>
);
export const IcTicket = ({ className = "size-4" }: P) => (
  <svg {...base} className={className}><path d="M5 2.5h14v19l-2.5-1.5-2.3 1.5-2.2-1.5-2.3 1.5-2.2-1.5L5 21.5z" /><path d="M8.5 7.5h7M8.5 11h7M8.5 14.5h4" /></svg>
);
export const IcSubir = ({ className = "size-5" }: P) => (
  <svg {...base} className={className}><path d="M12 15.5V3.5M7.5 8 12 3.5 16.5 8" /><path d="M4 14.5v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></svg>
);
