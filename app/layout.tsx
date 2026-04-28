import type { Metadata } from 'next'
import { Fraunces, Syne } from 'next/font/google'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['300', '400', '700', '900'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-ui',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Mbare Direct — Zimbabwe\'s Buyer-First Marketplace',
  description:
    'Post a need. Get competitive pitches from verified sellers. Agriculture, Construction, and Transport.',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${fraunces.variable} ${syne.variable}`}>
      <body
        className="min-h-screen antialiased"
        style={{ fontFamily: 'var(--font-ui)' }}
      >
        {/* ── Navigation ── */}
        <nav
          className="px-4 py-3 flex items-center justify-between shadow-sm"
          style={{ backgroundColor: 'var(--charcoal)' }}
        >
          <a href="/" className="flex items-center gap-2 no-underline">
            {/* M mark SVG */}
            <svg width="32" height="32" viewBox="0 0 80 80" aria-hidden="true">
              <rect width="80" height="80" rx="15" fill="#1B4D2E" />
              <path
                d="M13 63L13 21L40 47L67 21L67 63"
                fill="none"
                stroke="#C8771C"
                strokeWidth="7.5"
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
            </svg>
            {/* Wordmark */}
            <span className="flex items-baseline gap-1">
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontStyle: 'italic',
                  fontWeight: 900,
                  fontSize: '1.35rem',
                  color: 'var(--cream)',
                  lineHeight: 1,
                }}
              >
                Mbare
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-ui)',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: 'var(--amber)',
                  lineHeight: 1,
                }}
              >
                Direct
              </span>
            </span>
          </a>

          <div className="flex gap-3 text-sm font-semibold">
            <a
              href="/auth/login"
              style={{ color: 'var(--cream)', fontFamily: 'var(--font-ui)' }}
              className="hover:opacity-80 transition-opacity"
            >
              Login
            </a>
            <a
              href="/auth/register"
              className="rounded-lg px-3 py-1 transition-colors"
              style={{
                backgroundColor: 'var(--amber)',
                color: 'var(--charcoal)',
                fontFamily: 'var(--font-ui)',
                fontWeight: 700,
              }}
            >
              Join
            </a>
          </div>
        </nav>

        <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>

        {/* ── Footer ── */}
        <footer
          className="mt-4 px-4 py-10"
          style={{ backgroundColor: 'var(--charcoal)' }}
        >
          <div className="max-w-3xl mx-auto flex flex-col items-center gap-3 text-center">
            {/* Brand mark */}
            <svg width="40" height="40" viewBox="0 0 80 80" aria-hidden="true">
              <rect width="80" height="80" rx="15" fill="#1B4D2E" />
              <path
                d="M13 63L13 21L40 47L67 21L67 63"
                fill="none"
                stroke="#C8771C"
                strokeWidth="7.5"
                strokeLinecap="square"
                strokeLinejoin="miter"
              />
            </svg>
            {/* Tagline */}
            <p
              style={{
                fontFamily: 'var(--font-ui)',
                fontWeight: 600,
                fontSize: '0.75rem',
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: 'var(--amber)',
              }}
            >
              Zimbabwe to the World
            </p>
            <p
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-ui)',
              }}
            >
              © {new Date().getFullYear()} Mbare Direct · Zimbabwe&apos;s Buyer-First Marketplace
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
