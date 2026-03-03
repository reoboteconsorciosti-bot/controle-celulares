"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Monitor, Smartphone, Users, KeyRound, Server, ArrowLeftRight, Search, FileText } from "lucide-react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"

export function GlobalSearch() {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const [results, setResults] = React.useState<{
        users: any[]
        assets: any[]
        simCards: any[]
        credentials: any[]
    }>({ users: [], assets: [], simCards: [], credentials: [] })
    const [loading, setLoading] = React.useState(false)
    const router = useRouter()

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    React.useEffect(() => {
        if (query.length < 2) {
            setResults({ users: [], assets: [], simCards: [], credentials: [] })
            return
        }

        const timer = setTimeout(async () => {
            setLoading(true)
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
                if (res.ok) {
                    const data = await res.json()
                    setResults(data)
                }
            } catch (error) {
                console.error("Failed to search", error)
            } finally {
                setLoading(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [query])

    const runCommand = React.useCallback((command: () => void) => {
        setOpen(false)
        command()
    }, [])

    return (
        <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
            <CommandInput
                placeholder="Digite para pesquisar em todo o painel..."
                value={query}
                onValueChange={setQuery}
            />
            <CommandList>
                <CommandEmpty>
                    {loading ? "Buscando..." : "Nenhum resultado encontrado."}
                </CommandEmpty>

                {query.length === 0 && (
                    <CommandGroup heading="Sugestões de Páginas">
                        <CommandItem onSelect={() => runCommand(() => router.push("/colaboradores"))}>
                            <Users className="mr-2 h-4 w-4 text-blue-500" />
                            <span>Colaboradores (Sheets)</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/hardware"))}>
                            <Monitor className="mr-2 h-4 w-4 text-indigo-500" />
                            <span>Equipamentos</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/chips"))}>
                            <Smartphone className="mr-2 h-4 w-4 text-violet-500" />
                            <span>Linhas e Chips</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/credenciais"))}>
                            <KeyRound className="mr-2 h-4 w-4 text-amber-500" />
                            <span>Cofre de Senhas</span>
                        </CommandItem>
                    </CommandGroup>
                )}

                {results.users.length > 0 && (
                    <CommandGroup heading="Colaboradores">
                        {results.users.map((user) => (
                            <CommandItem
                                key={user.id}
                                onSelect={() => runCommand(() => router.push(`/colaboradores`))}
                            >
                                <Users className="mr-2 h-4 w-4" />
                                <span>{user.name}</span>
                                <span className="ml-auto text-xs text-muted-foreground">{user.email}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {results.assets.length > 0 && (
                    <CommandGroup heading="Equipamentos">
                        {results.assets.map((asset) => (
                            <CommandItem
                                key={asset.id}
                                onSelect={() => runCommand(() => router.push(`/hardware`))}
                            >
                                <Monitor className="mr-2 h-4 w-4" />
                                <span>{asset.model}</span>
                                <span className="ml-auto text-xs text-muted-foreground">IMEI: {asset.imei2 || asset.imei1 || "N/A"}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {results.simCards.length > 0 && (
                    <CommandGroup heading="Chips (SIM Cards)">
                        {results.simCards.map((sim) => (
                            <CommandItem
                                key={sim.id}
                                onSelect={() => runCommand(() => router.push(`/chips`))}
                            >
                                <Smartphone className="mr-2 h-4 w-4" />
                                <span>{sim.phoneNumber}</span>
                                <span className={`ml-auto text-xs font-semibold ${sim.planType === 'pessoal' ? 'text-zinc-500' : 'text-blue-500'}`}>
                                    {sim.planType === 'pessoal' ? 'Pessoal / Privado' : 'Plano Reobote'}
                                </span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}

                {results.credentials.length > 0 && (
                    <CommandGroup heading="Cofre de Credenciais">
                        {results.credentials.map((cred) => (
                            <CommandItem
                                key={cred.id}
                                onSelect={() => runCommand(() => router.push(`/credenciais`))}
                            >
                                <KeyRound className="mr-2 h-4 w-4" />
                                <span>{cred.system}</span>
                                <span className="ml-auto text-xs text-muted-foreground">{cred.username}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                )}
            </CommandList>
        </CommandDialog>
    )
}
