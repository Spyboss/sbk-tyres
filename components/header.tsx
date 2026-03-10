'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { ShoppingCart, LogOut, Menu, X } from 'lucide-react'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useCartStore } from '@/lib/store'
import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function Header() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | undefined>(undefined)
  const itemCount = useCartStore((state) => state.getItemCount())
  const { user, loading } = useAuth()

  useEffect(() => {
    if (user) {
      // Fetch user role
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          setUserRole(data?.role)
        })
    } else {
      setUserRole(undefined)
    }
  }, [user])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/catalog'
  }

  const isActive = (path: string) => pathname === path
  const isAuthenticated = !!user && !loading

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative h-10 w-24">
            <Image
              src="/brand/sbk-logo.png"
              alt="SBK Tyres"
              fill
              className="object-contain"
              priority
            />
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/catalog"
            className={`text-sm font-medium transition-colors pb-1 border-b-2 ${
              isActive('/catalog') 
                ? 'text-primary border-primary' 
                : 'text-muted-foreground border-transparent hover:text-primary hover:border-primary/50'
            }`}
          >
            Catalog
          </Link>
          
          {isAuthenticated && (
            <>
              <Link
                href="/orders"
                className={`text-sm font-medium transition-colors pb-1 border-b-2 ${
                  isActive('/orders') 
                    ? 'text-primary border-primary' 
                    : 'text-muted-foreground border-transparent hover:text-primary hover:border-primary/50'
                }`}
              >
                Orders
              </Link>
              
              {(userRole === 'admin' || userRole === 'staff') && (
                <Link
                  href="/admin"
                  className={`text-sm font-medium transition-colors pb-1 border-b-2 ${
                    isActive('/admin') 
                      ? 'text-primary border-primary' 
                      : 'text-muted-foreground border-transparent hover:text-primary hover:border-primary/50'
                  }`}
                >
                  Admin
                </Link>
              )}
            </>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {/* Cart Button */}
          <Link href="/cart">
            <Button variant="outline" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <Badge 
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center"
                  variant="default"
                >
                  {itemCount}
                </Badge>
              )}
            </Button>
          </Link>

          {/* Auth Buttons */}
          {!loading && (
            isAuthenticated ? (
              <Button variant="secondary" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            ) : (
              <Link href="/login">
                <Button size="sm" className="bg-primary hover:bg-primary/90">Login</Button>
              </Link>
            )
          )}

          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t p-4 space-y-2">
          <Link
            href="/catalog"
            className={`block py-2 text-sm font-medium ${
              isActive('/catalog') ? 'text-primary font-bold' : ''
            }`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Catalog
          </Link>
          
          {isAuthenticated && (
            <>
              <Link
                href="/orders"
                className={`block py-2 text-sm font-medium ${
                  isActive('/orders') ? 'text-primary font-bold' : ''
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                Orders
              </Link>
              
              {(userRole === 'admin' || userRole === 'staff') && (
                <Link
                  href="/admin"
                  className={`block py-2 text-sm font-medium ${
                    isActive('/admin') ? 'text-primary font-bold' : ''
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Admin
                </Link>
              )}
            </>
          )}
          
          {!loading && !isAuthenticated && (
            <Link
              href="/login"
              className="block py-2 text-sm font-medium text-primary"
              onClick={() => setMobileMenuOpen(false)}
            >
              Login
            </Link>
          )}
        </nav>
      )}
    </header>
  )
}
