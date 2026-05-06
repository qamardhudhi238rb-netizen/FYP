import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-display', display: 'swap' })
const dmSans   = DM_Sans        ({ subsets: ['latin'], variable: '--font-body',    display: 'swap' })
const jbMono   = JetBrains_Mono ({ subsets: ['latin'], variable: '--font-mono',    display: 'swap' })

export const metadata: Metadata = {
  title: 'EmoVision — Emotion Intelligence',
  description: 'Real-time AI emotion detection for images, videos, and webcam.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable} ${jbMono.variable}`}>
      <body className="font-body bg-obsidian text-white antialiased">
        {children}
      </body>
    </html>
  )
}