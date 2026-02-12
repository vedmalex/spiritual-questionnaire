import { HeadContent, Scripts, createRootRoute, useLocation } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useEffect, useState } from 'react'

import Header from '../components/Header'
import { initializeAnalytics, trackPageView } from '../utils/analytics'
import { getLanguage, initializeLanguage, subscribeLanguage } from '../utils/i18n'
import { registerPwaServiceWorker } from '../utils/pwa'
import { startQuestionnaireUpdateNotifications } from '../utils/questionnaireUpdateNotifications'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Spiritual Self-Assessment',
      },
      {
        name: 'description',
        content: 'Самооценка духовных качеств на основе шастр',
      },
      {
        name: 'theme-color',
        content: '#0f4c5c',
      },
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'default',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'manifest',
        href: './manifest.webmanifest',
      },
      {
        rel: 'icon',
        href: './favicon.ico',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '192x192',
        href: './icons/qwiz-icon-192.png',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: './icons/apple-touch-icon.png',
      },
    ],
  }),

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const locationHref = useLocation({
    select: (location) => location.href,
  })
  const [language, setLanguageState] = useState(() => getLanguage())

  useEffect(() => {
    initializeAnalytics()
  }, [])

  useEffect(() => {
    void registerPwaServiceWorker()
    const stopNotifications = startQuestionnaireUpdateNotifications()

    return stopNotifications
  }, [])

  useEffect(() => {
    trackPageView(locationHref)
  }, [locationHref])

  useEffect(() => {
    initializeLanguage()
    const current = getLanguage()
    setLanguageState(current)
    if (typeof document !== 'undefined') {
      document.documentElement.lang = current
    }

    return subscribeLanguage((nextLanguage) => {
      setLanguageState(nextLanguage)
      if (typeof document !== 'undefined') {
        document.documentElement.lang = nextLanguage
      }
    })
  }, [])

  return (
    <html lang={language}>
      <head>
        <HeadContent />
      </head>
      <body>
        <Header />
        <main key={language} className="min-h-screen">{children}</main>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
