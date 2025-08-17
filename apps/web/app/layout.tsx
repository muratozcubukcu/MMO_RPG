import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'AI MMO RPG - Text-Based Fantasy Adventure',
  description: 'Create AI-generated worlds and explore them through natural language in this text-based MMO RPG.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
          {children}
        </div>
      </body>
    </html>
  )
}
