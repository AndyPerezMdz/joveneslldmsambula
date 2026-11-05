import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/cinzel";
import "./globals.css";
import { Avisos } from "@/components/Formulario";

export const metadata: Metadata = {
  title: { default: "Jóvenes · La Luz del Mundo", template: "%s · Jóvenes" },
  description: "Asistencia, finanzas y evidencias del grupo de jóvenes",
  applicationName: "Jóvenes",
  // iPhone: que abra a pantalla completa al instalarla desde Safari
  appleWebApp: { capable: true, title: "Jóvenes", statusBarStyle: "black-translucent" },
  icons: { apple: "/iconos/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#0a3156", viewportFit: "cover" };

// Se ejecuta antes de pintar para que no haya parpadeo blanco en modo oscuro.
// Prioridad: lo que eligió la persona → tema del sistema.
const temaInicial = `(function(){try{var t=localStorage.getItem("tema");if(!t){t=matchMedia("(prefers-color-scheme: dark)").matches?"oscuro":"claro"}if(t==="oscuro")document.documentElement.classList.add("dark")}catch(e){}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: temaInicial }} />
      </head>
      <body className="min-h-dvh font-sans antialiased">
        {children}
        <Avisos />
      </body>
    </html>
  );
}
