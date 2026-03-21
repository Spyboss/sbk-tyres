'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export function ServiceWorkerRegistration() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  const isIos = useMemo(() => {
    if (typeof window === 'undefined') {
      return false
    }

    const ua = window.navigator.userAgent
    const isAppleMobile = /iphone|ipad|ipod/i.test(ua)
    const isIpadOsDesktopMode = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1

    return isAppleMobile || isIpadOsDesktopMode
  }, [])

  const isStandalone = useMemo(() => {
    if (typeof window === 'undefined') {
      return false
    }

    const standaloneNavigator = window.navigator as Navigator & { standalone?: boolean }
    return window.matchMedia('(display-mode: standalone)').matches || Boolean(standaloneNavigator.standalone)
  }, [])

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
        setShowPrompt(false)
      })
    }
  }, [])

  useEffect(() => {
    if (isStandalone) {
      return
    }

    const dismissed = window.localStorage.getItem('pwa-install-dismissed') === '1'

    if (isIos && !dismissed) {
      setShowPrompt(true)
      return
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferredPrompt(event as BeforeInstallPromptEvent)
      if (!dismissed) {
        setShowPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    }
  }, [isIos, isStandalone])

  useEffect(() => {
    const onAppInstalled = () => {
      setShowPrompt(false)
      setDeferredPrompt(null)
      window.localStorage.removeItem('pwa-install-dismissed')
    }

    window.addEventListener('appinstalled', onAppInstalled)

    return () => {
      window.removeEventListener('appinstalled', onAppInstalled)
    }
  }, [])

  const dismissPrompt = () => {
    window.localStorage.setItem('pwa-install-dismissed', '1')
    setShowPrompt(false)
  }

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return
    }

    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice

    if (choice.outcome === 'accepted') {
      setShowPrompt(false)
      setDeferredPrompt(null)
      window.localStorage.removeItem('pwa-install-dismissed')
      return
    }

    dismissPrompt()
  }

  if (!showPrompt || isStandalone) {
    return null
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 px-4">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 rounded-lg border bg-background p-3 shadow-lg">
        <div className="text-sm">
          <p className="font-medium text-foreground">Install SBK Tyres app</p>
          {isIos ? (
            <p className="text-muted-foreground">Tap Share, then Add to Home Screen.</p>
          ) : (
            <p className="text-muted-foreground">Install for faster access on your phone.</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!isIos && deferredPrompt ? (
            <Button size="sm" onClick={handleInstall}>
              Install
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={dismissPrompt}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
