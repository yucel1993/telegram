import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Chat Event Date',
  description: 'Create and manage events with chat functionality',
  generator: 'Next.js',
  applicationName: 'Chat Event Date',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
