import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'JUMANJI - La Aventura',
  description: 'Sobrevive a la jungla descubriendo los códigos.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Macondo&family=Outfit:wght@400;600;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
