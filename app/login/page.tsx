"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Shield, LockIcon, ArrowRight, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function LoginPage() {
    const router = useRouter()
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const res = await signIn("credentials", {
                password,
                redirect: false,
            })

            if (res?.error) {
                toast.error("Senha incorreta. Tente novamente.")
            } else {
                toast.success("Acesso liberado!")
                router.push("/credenciais")
                router.refresh()
            }
        } catch (error) {
            toast.error("Ocorreu um erro ao tentar fazer login.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
            <div className="w-full max-w-md">
                <div className="flex flex-col items-center text-center mb-8 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 ring-8 ring-primary/5">
                        <Shield className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground/90">Acesso Restrito</h1>
                    <p className="text-muted-foreground mt-2 text-[15px]">
                        A visualizacao de credenciais e senhas exige uma chave de administrador para continuar.
                    </p>
                </div>

                <div className="card-premium p-8 shadow-xl shadow-primary/5 border-primary/10 animate-in slide-in-from-bottom-6 duration-700 bg-card rounded-xl">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-foreground/80 font-medium">Chave Mestra</Label>
                            <div className="relative">
                                <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/60" />
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-10 h-12 bg-muted/20 border-border/50 focus-visible:ring-primary/40 text-lg transition-all rounded-lg"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-[15px] font-semibold tracking-wide shadow-md group transition-all rounded-lg"
                            disabled={isLoading || !password}
                        >
                            {isLoading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    Desbloquear Acesso
                                    <ArrowRight className="ml-2 h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </Button>
                    </form>
                </div>

                <div className="mt-8 text-center animate-in fade-in duration-1000 delay-300">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                        Area de Seguranca Corporate
                    </p>
                </div>
            </div>
        </div>
    )
}
