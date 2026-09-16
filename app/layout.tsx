import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { LocaleProvider } from '@/lib/locale-context'
import { ThemeProvider } from '@/features/themes/shared/theme-provider'
import { ThemeNavigation } from '@/features/themes/shared/theme-navigation'
import { PwaRegister } from '@/components/pwa-register'
import { PwaInstallPrompt } from '@/components/pwa-install-prompt'
import { RouteProgress } from '@/components/route-progress'
import { DEFAULT_LOCALE, localeHtmlLang } from '@/lib/i18n'
import { getPageMetadata } from '@/lib/page-metadata'
import { DEFAULT_THEME, THEME_CONFIG, themeBootstrapScript, themeUsesDarkChrome } from '@/lib/theme'
import { themeResourcesBootstrapScript } from '@/lib/theme-resources'
import './globals.css'
import './pwa-safe-area.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  preload: false,
})

export const metadata: Metadata = {
  ...getPageMetadata('/', DEFAULT_LOCALE),
  applicationName: 'XM-Games',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'XM-Games',
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    'apple-mobile-web-app-capable': 'yes',
    google: 'notranslate',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: {
      url: '/apple-touch-icon.png',
      sizes: '180x180',
      type: 'image/png',
    },
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: THEME_CONFIG[DEFAULT_THEME].themeColor,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang={localeHtmlLang[DEFAULT_LOCALE]}
      translate="no"
      className={themeUsesDarkChrome(DEFAULT_THEME) ? 'dark' : undefined}
      data-theme={DEFAULT_THEME}
      suppressHydrationWarning
    >
      <head>
        <script
          id="xm-games-theme-bootstrap"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript + themeResourcesBootstrapScript }}
        />
      </head>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        <PwaRegister />
        <ThemeProvider>
          <LocaleProvider>
            <RouteProgress />
            {children}
            <ThemeNavigation />
            <PwaInstallPrompt />
          </LocaleProvider>
        </ThemeProvider>
        {process.env.VERCEL === '1' && <Analytics />}
      </body>
    </html>
  )
}
