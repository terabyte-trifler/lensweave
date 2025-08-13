// src/app/layout.tsx
import './globals.css'
import Providers from './providers'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* Ignore extension-injected attributes/classes on <body> */}
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
