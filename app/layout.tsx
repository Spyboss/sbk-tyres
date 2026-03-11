import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/header'
import { AuthProvider } from '@/components/auth-provider'
import { ServiceWorkerRegistration } from '@/components/service-worker-registration'

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
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="SBK Tyres" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ServiceWorkerRegistration />
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
