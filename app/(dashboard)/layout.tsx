"use client"

import { useState, useEffect } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import { GlobalSearch } from "@/components/global-search"
import { Search } from "lucide-react"

import { ThemeToggle } from "@/components/theme-toggle"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <h1 className="text-sm font-medium text-muted-foreground mr-4 hidden md:block">
              Gestao de Ativos de TI
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
              className="flex items-center gap-2 px-3 py-1.5 text-sm w-48 md:w-64 justify-between bg-muted/40 hover:bg-muted/80 border border-border/50 rounded-lg text-muted-foreground transition-colors"
            >
              <span className="flex items-center gap-2"><Search className="h-4 w-4" /> Pesquisar...</span>
              <kbd className="pointer-events-none hidden md:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 relative">
          {/* Subtle Grid Pattern from Login adapted to Dashboard */}
          <div className="absolute inset-0 pointer-events-none -z-10 bg-background">
            {/* Grid for Light Mode */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_10%,transparent_100%)] dark:hidden" />
            {/* Grid for Dark Mode */}
            <div className="absolute inset-0 hidden dark:block bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_0%,#000_20%,transparent_100%)]" />
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary/5 to-transparent blur-3xl opacity-50 dark:opacity-20 hidden md:block" />
          </div>

          <div className="relative z-10 w-full h-full">
            <GlobalSearch />
            {children}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
