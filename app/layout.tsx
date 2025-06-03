import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="relative min-h-screen bg-gray-50">
        {/* Botón fijo en la parte superior derecha */}
        <a
          href="https://alfonsa-tools-modern.vercel.app/" // ⬅️ Cambiá por tu URL real
          target="_blank"
          rel="noopener noreferrer"
          className="fixed top-4 right-4 z-50 px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
        >
          Volver al Inicio
        </a>

        {/* Contenido de la página */}
        {children}
      </body>
    </html>
  )
}
