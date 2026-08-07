import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { LocaleProvider } from '@/lib/locale-context'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeTwoTabBar } from '@/components/theme-two-tab-bar'
import { ThemeThreeNavigation } from '@/components/theme-three-navigation'
import { PwaRegister } from '@/components/pwa-register'
import { PwaInstallPrompt } from '@/components/pwa-install-prompt'
import { getPageMetadata } from '@/lib/page-metadata'
import { themeBootstrapScript } from '@/lib/theme'
import './globals.css'
import './theme-one.css'
import './theme-two.css'
import './theme-three.css'
import './classic-games.css'
import './theme-one-classic-games.css'
import './theme-two-classic-games.css'
import './theme-three-classic-games.css'
import './schulte-grid.css'
import './theme-one-schulte-grid.css'
import './theme-two-schulte-grid.css'
import './theme-three-schulte-grid.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
})
const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
})

export const metadata: Metadata = {
  ...getPageMetadata('/', 'zh'),
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
      lang="zh-CN"
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
            {children}
            <ThemeTwoTabBar />
            <ThemeThreeNavigation />
            <PwaInstallPrompt />
          </LocaleProvider>
        </ThemeProvider>
        {process.env.VERCEL === '1' && <Analytics />}
      </body>
    </html>
  )
}
