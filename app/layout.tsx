import type { Metadata } from 'next'
import './globals.css'
import { Header } from '@/components/header'
import { AuthProvider } from '@/components/auth-provider'

export const metadata: Metadata = {
  title: 'SBK Tyre Distributors',
  description: 'B2B Wholesale Tyre Ordering System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
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
