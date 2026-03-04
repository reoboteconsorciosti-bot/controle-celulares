import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import NextAuthProvider from '@/components/next-auth-provider'
import { SWRProvider } from '@/components/swr-provider'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Celulares e Tablets - Reobote Consórcios',
  description: 'Sistema de gestao de ativos de TI - Reobote Consorcios',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <NextAuthProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <SWRProvider>
              {children}
              <Toaster richColors position="top-right" />
              <Analytics />
            </SWRProvider>
          </ThemeProvider>
        </NextAuthProvider>
      </body>
    </html>
  )
}
