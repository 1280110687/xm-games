import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { LocaleProvider } from '@/lib/locale-context'
import { ThemeProvider } from '@/components/theme-provider'
import { ThemeTwoTabBar } from '@/components/theme-two-tab-bar'
import { getPageMetadata } from '@/lib/page-metadata'
import { themeBootstrapScript } from '@/lib/theme'
import './globals.css'
import './theme-one.css'
import './theme-two.css'

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
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
}

export const viewport: Viewport = {
  themeColor: '#101421',
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
        <script
          id="xm-games-theme-bootstrap"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeBootstrapScript }}
        />
        <ThemeProvider>
          <LocaleProvider>
            {children}
            <ThemeTwoTabBar />
          </LocaleProvider>
        </ThemeProvider>
        {process.env.VERCEL === '1' && <Analytics />}
      </body>
    </html>
  )
}
