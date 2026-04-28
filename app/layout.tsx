import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mbare Direct — Zimbabwe\'s Buyer-First Marketplace',
  description:
    'Post a need. Get competitive pitches from verified sellers. Agriculture, Construction, and Transport.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-800 antialiased">
        <nav className="bg-green-700 text-white px-4 py-3 flex items-center justify-between shadow-sm">
          <a href="/" className="font-bold text-lg tracking-tight">
            🛒 Mbare Direct
          </a>
          <div className="flex gap-3 text-sm font-semibold">
            <a href="/auth/login" className="hover:underline">
              Login
            </a>
            <a
              href="/auth/register"
              className="bg-white text-green-700 rounded-lg px-3 py-1 hover:bg-green-50"
            >
              Join
            </a>
          </div>
        </nav>
        <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
        <footer className="text-center text-xs text-slate-400 py-8 mt-4">
          © {new Date().getFullYear()} Mbare Direct · Zimbabwe's Buyer-First Marketplace
        </footer>
      </body>
    </html>
  )
}
