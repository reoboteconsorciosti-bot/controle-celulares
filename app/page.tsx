"use client"

import { useEffect, useState } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ShieldCheck, UserCircle2 } from "lucide-react"

export default function LoginPage() {
    const { data: session, status } = useSession()
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (status === "authenticated") {
            router.push("/dashboard")
        }
    }, [status, router])

    const handleGoogleSignIn = async () => {
        setIsLoading(true)
        await signIn("google", { callbackUrl: "/dashboard" })
    }

    const handleAnonymousAccess = () => {
        router.push("/dashboard")
    }

    // Loader Center Screen
    if (status === "loading" || status === "authenticated") {
        return (
            <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
                <div className="w-8 h-8 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-8 font-sans selection:bg-blue-500/30 overflow-hidden relative">

            {/* Background Effects (Corporate / Cyber Security Theme) */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] bg-gradient-to-br from-blue-600/10 to-transparent rounded-full blur-[120px]" />
                <div className="absolute top-[20%] -right-[20%] w-[60%] h-[60%] bg-gradient-to-tl from-indigo-500/10 to-transparent rounded-full blur-[100px]" />

                {/* Subtle Grid Pattern */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_20%,transparent_100%)]" />
            </div>

            {/* Main Auth Container */}
            <div className="w-full max-w-[420px] relative z-10 animate-in fade-in zoom-in-95 fill-mode-both duration-700">

                {/* Top Floating Badge */}
                <div className="flex justify-center mb-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/40 border border-blue-900/50 text-[10px] font-bold tracking-widest text-blue-400 backdrop-blur-md shadow-2xl uppercase">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Ambiente Restrito
                    </div>
                </div>

                {/* Glassmorphism Card */}
                <div className="bg-zinc-900/60 backdrop-blur-2xl border border-zinc-700/50 p-8 sm:p-10 rounded-[28px] shadow-2xl flex flex-col items-center relative overflow-hidden group/card transition-all">

                    {/* Top Glow Edge */}
                    <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-blue-500/70 to-transparent opacity-50 group-hover/card:opacity-100 transition-opacity duration-1000" />

                    {/* Branding Section */}
                    <div className="flex flex-col items-center gap-5 w-full mb-8">
                        {/* Logo Circle */}
                        <div className="h-16 w-16 bg-white rounded-2xl shadow-xl shadow-black/40 border border-zinc-200/20 flex items-center justify-center p-2.5 relative">
                            <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10 pointer-events-none" />
                            <Image
                                src="/reobote-logo.png"
                                alt="Reobote"
                                fill
                                className="object-contain p-2 scale-[1.3] md:scale-150"
                                priority
                            />
                        </div>

                        {/* Text Header */}
                        <div className="text-center space-y-1.5">
                            <h1 className="text-2xl font-bold tracking-tight text-white">
                                Painel de Ativos
                            </h1>
                            <p className="text-[13px] font-medium text-zinc-400">
                                Identifique-se com sua credencial corporativa
                            </p>
                        </div>
                    </div>

                    {/* Auth Actions Actions */}
                    <div className="w-full flex flex-col gap-4">

                        {/* Primary Interactive Google Button */}
                        <Button
                            size="lg"
                            className="w-full h-12 text-[15px] font-semibold rounded-xl shadow-lg shadow-blue-900/20 bg-blue-600 hover:bg-blue-500 border border-blue-500 hover:border-blue-400 text-white transition-all relative overflow-hidden group"
                            onClick={handleGoogleSignIn}
                            disabled={isLoading}
                        >
                            {/* Efeito Sweep de Luz (Glassmorphism Light Ray) - Preservado!! */}
                            <div className="absolute inset-0 bg-white/20 w-[150%] translate-x-[-150%] group-hover:translate-x-[150%] skew-x-[-20deg] transition-transform duration-700 ease-in-out" />

                            <div className="flex items-center justify-center gap-3 relative z-10 w-full">
                                {isLoading ? (
                                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                                ) : (
                                    <>
                                        <div className="bg-white p-[3px] rounded-sm flex items-center justify-center shadow-sm">
                                            <svg className="w-[14px] h-[14px]" viewBox="0 0 24 24">
                                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                                <path fill="none" d="M1 1h22v22H1z" />
                                            </svg>
                                        </div>
                                        <span className="tracking-wide">
                                            Entrar com Google
                                        </span>
                                    </>
                                )}
                            </div>
                        </Button>

                        {/* Divider */}
                        <div className="flex items-center justify-center gap-3 my-2 opacity-40">
                            <div className="h-[1px] bg-zinc-600 flex-1" />
                            <span className="text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase">OU</span>
                            <div className="h-[1px] bg-zinc-600 flex-1" />
                        </div>

                        {/* Ghost Button */}
                        <Button
                            variant="ghost"
                            className="w-full h-11 text-[13px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/80 font-medium tracking-wide transition-colors"
                            onClick={handleAnonymousAccess}
                        >
                            <UserCircle2 className="w-4 h-4 mr-2" />
                            Acesso Anônimo / Limitado
                        </Button>
                    </div>
                </div>

                {/* Footer Notes (Out of card) */}
                <div className="text-center mt-8 space-y-2 opacity-60">
                    <p className="text-[10px] font-bold tracking-[0.15em] text-zinc-500 uppercase">
                        &copy; 2026 Reobote Tecnologia
                    </p>
                    <p className="text-[10px] font-medium text-zinc-600">
                        O acesso sem identificação restringe o rastreio na auditoria.
                    </p>
                </div>
            </div>
        </div>
    )
}
