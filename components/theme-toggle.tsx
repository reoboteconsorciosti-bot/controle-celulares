"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    // Ensure hydration match
    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <button className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-background text-muted-foreground opacity-50" />
        )
    }

    const isDark = resolvedTheme === "dark" || theme === "dark"

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/50 bg-background hover:bg-muted/80 text-muted-foreground transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 overflow-hidden group"
            type="button"
            aria-label="Toggle theme"
        >
            <div className="relative h-[20px] w-[20px] overflow-visible">
                {/* Sun Icon (Visible in Light Mode) */}
                <Sun
                    className={`absolute inset-0 h-full w-full text-amber-500 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isDark ? "rotate-[-90deg] scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"
                        }`}
                />
                {/* Moon Icon (Visible in Dark Mode) */}
                <Moon
                    className={`absolute inset-0 h-full w-full text-indigo-400 transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isDark ? "rotate-0 scale-100 opacity-100" : "rotate-[90deg] scale-0 opacity-0"
                        }`}
                />
            </div>

            {/* Premium Glow Effect on Hover */}
            <div className="absolute inset-0 z-[-1] bg-gradient-to-tr from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        </button>
    )
}
