import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { LocaleProvider } from '@/lib/locale-context'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeNavigation } from '@/components/theme-navigation'
import { PwaRegister } from '@/components/pwa-register'
import { PwaInstallPrompt } from '@/components/pwa-install-prompt'
import { RouteProgress } from '@/components/route-progress'
import { DEFAULT_LOCALE, localeHtmlLang } from '@/lib/i18n'
import { getPageMetadata } from '@/lib/page-metadata'
import { themeBootstrapScript } from '@/lib/theme'
import './globals.css'
import './theme-one.css'
import './theme-two.css'
import './theme-three.css'
import './theme-four.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
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
  minimumScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#101421',
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
      className="dark"
      data-theme="theme-one"
      suppressHydrationWarning
    >
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        <PwaRegister />
        <script
          id="xm-games-theme-bootstrap"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
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
