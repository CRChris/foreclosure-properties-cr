import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/i18n/LanguageContext';

export const metadata: Metadata = {
  title: 'REmatrixCR | Remates Judiciales Costa Rica & Inteligencia Inmobiliaria',
  description: 'REmatrixCR: Plataforma líder para rastrear, analizar y calcular rendimientos de remates judiciales y subastas inmobiliarias en Costa Rica con datos del Boletín Judicial.',
  keywords: ['REmatrixCR', 'Remates Judiciales Costa Rica', 'Subastas Inmobiliarias CR', 'Boletin Judicial Remates', 'Foreclosure Properties Costa Rica', 'Costa Rica Judicial Auctions'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-emerald-500 selection:text-white">
        <LanguageProvider>
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}
