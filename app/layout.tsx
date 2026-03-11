import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/header'
import { AuthProvider } from '@/components/auth-provider'

export const metadata: Metadata = {
  title: 'SBK Tyre Distributors',
  description: 'B2B Wholesale Tyre Ordering System',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'SBK Tyres',
  },
  icons: {
    apple: [
      { url: '/icon-192.png', sizes: '192x192' },
      { url: '/icon-512.png', sizes: '512x512' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SBK Tyres" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider>
          <Header />
          <main className="container py-4 md:py-8 px-4">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  )
}
