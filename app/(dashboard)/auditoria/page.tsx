"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Server, Activity, ArrowRight, ShieldAlert, BadgePlus, RefreshCcw, Trash2 } from "lucide-react"

import { Skeleton } from "@/components/ui/skeleton"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type AuditLog = {
    id: number
    action: "INSERT" | "UPDATE" | "DELETE"
    tableName: string
    recordId: number
    oldData: any | null
    newData: any | null
    userId: string
    createdAt: string
}

export default function AuditoriaPage() {
    const { data: logs, isLoading: swrLoading } = useSWR<AuditLog[]>("/api/audit")
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const isLoading = swrLoading || !mounted

    function getActionInfo(action: string) {
        switch (action) {
            case "INSERT":
                return { icon: BadgePlus, color: "text-emerald-500", bg: "bg-emerald-500/10", label: "Criacao" }
            case "UPDATE":
                return { icon: RefreshCcw, color: "text-blue-500", bg: "bg-blue-500/10", label: "Modificacao" }
            case "DELETE":
                return { icon: Trash2, color: "text-destructive", bg: "bg-destructive/10", label: "Delecao" }
            default:
                return { icon: Activity, color: "text-muted-foreground", bg: "bg-muted", label: action }
        }
    }

    function formatValue(val: any): string {
        if (val === null || val === undefined) return "null"
        if (typeof val === "object") return JSON.stringify(val)
        return String(val)
    }

    // Compara os dois objetos e retorna as chaves que mudaram
    function getDiff(oldData: any, newData: any) {
        const allKeys = Array.from(new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]))
        return allKeys.filter(key => formatValue(oldData?.[key]) !== formatValue(newData?.[key]))
    }

    return (
        <div className="flex flex-col gap-8 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground/90 flex items-center gap-3">
                        <Server className="h-7 w-7 text-primary/80" />
                        Trilha de Auditoria
                    </h2>
                    <p className="text-[15px] text-muted-foreground mt-1">
                        Historico imutavel de acoes criticas no sistema para controle e conformidade.
                    </p>
                </div>
            </div>

            <div className="card-premium flex flex-col overflow-hidden">
                <div className="p-0 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[13px] text-muted-foreground uppercase bg-muted/30 border-b border-border/40">
                            <tr>
                                <th className="px-6 py-4 font-semibold tracking-wide">Data / Hora</th>
                                <th className="px-6 py-4 font-semibold tracking-wide">Usuario (Autor)</th>
                                <th className="px-6 py-4 font-semibold tracking-wide">Acao Realizada</th>
                                <th className="px-6 py-4 font-semibold tracking-wide">Entidade (Tabela)</th>
                                <th className="px-6 py-4 font-semibold tracking-wide text-right">Detalhes Técnicos</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4"><Skeleton className="h-5 w-[140px]" /></td>
                                        <td className="px-6 py-4"><Skeleton className="h-5 w-[180px]" /></td>
                                        <td className="px-6 py-4"><Skeleton className="h-6 w-[100px] rounded-full" /></td>
                                        <td className="px-6 py-4"><Skeleton className="h-5 w-[120px]" /></td>
                                        <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-24 ml-auto rounded-md" /></td>
                                    </tr>
                                ))
                            ) : logs && logs.length > 0 ? (
                                logs.map((log) => {
                                    const actionInfo = getActionInfo(log.action)
                                    const ActionIcon = actionInfo.icon
                                    return (
                                        <tr key={log.id} className="hover:bg-muted/5 transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap text-muted-foreground/80 font-medium">
                                                {format(new Date(log.createdAt), "dd MMM yyyy 'as' HH:mm", { locale: ptBR })}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                                        {log.userId.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-semibold text-foreground/80">{log.userId}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${actionInfo.bg} ${actionInfo.color}`}>
                                                    <ActionIcon className="h-3.5 w-3.5" />
                                                    {actionInfo.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-mono text-[13px] text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                                                    {log.tableName} <span className="opacity-50">#{log.recordId}</span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 font-medium text-xs opacity-70 group-hover:opacity-100 transition-opacity">
                                                            Ver Detalhes
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                                                        <DialogHeader>
                                                            <DialogTitle className="flex items-center gap-2 text-xl">
                                                                <ShieldAlert className="h-5 w-5 text-primary" />
                                                                Inspecao de Log #{log.id}
                                                            </DialogTitle>
                                                        </DialogHeader>
                                                        <div className="py-4 space-y-6">
                                                            <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/40">
                                                                <div>
                                                                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Autor</p>
                                                                    <p className="font-medium">{log.userId}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Data / Hora Exata</p>
                                                                    <p className="font-medium">{format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss")}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Tabela / ID</p>
                                                                    <p className="font-mono font-medium">{log.tableName} <span className="text-muted-foreground">({log.recordId})</span></p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Operacao</p>
                                                                    <Badge variant="outline" className={`${actionInfo.color} font-bold`}>{log.action}</Badge>
                                                                </div>
                                                            </div>

                                                            {/* Diffs Visualizer */}
                                                            {log.action === "UPDATE" && log.oldData && log.newData && (
                                                                <div className="space-y-3">
                                                                    <h4 className="text-sm font-bold border-b pb-2">Alteracoes (Diff)</h4>
                                                                    <div className="space-y-2">
                                                                        {getDiff(log.oldData, log.newData).map(key => (
                                                                            <div key={key} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-sm font-mono bg-muted/10 p-2 rounded border border-border/30">
                                                                                <div className="break-all text-destructive/80 bg-destructive/5 px-2 py-1 rounded">
                                                                                    <span className="text-[10px] uppercase block mb-0.5 opacity-50 font-sans">{key} (Anterior)</span>
                                                                                    {formatValue(log.oldData[key])}
                                                                                </div>
                                                                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                                                                <div className="break-all text-emerald-600/80 bg-emerald-500/5 px-2 py-1 rounded">
                                                                                    <span className="text-[10px] uppercase block mb-0.5 opacity-50 font-sans">{key} (Novo)</span>
                                                                                    {formatValue(log.newData[key])}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                        {getDiff(log.oldData, log.newData).length === 0 && (
                                                                            <p className="text-sm text-muted-foreground italic">Nenhuma mudanca detectada nos campos monitorados.</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {log.action === "INSERT" && log.newData && (
                                                                <div className="space-y-2">
                                                                    <h4 className="text-sm font-bold border-b pb-2">Payload Inserido</h4>
                                                                    <pre className="text-[11px] p-4 bg-muted/40 rounded-xl overflow-x-auto border border-border/40 text-foreground/80 font-mono">
                                                                        {JSON.stringify(log.newData, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            )}

                                                            {log.action === "DELETE" && log.oldData && (
                                                                <div className="space-y-2">
                                                                    <h4 className="text-sm font-bold border-b pb-2">Registro Destruido</h4>
                                                                    <pre className="text-[11px] p-4 bg-destructive/5 rounded-xl border border-destructive/20 text-destructive/80 font-mono overflow-x-auto">
                                                                        {JSON.stringify(log.oldData, null, 2)}
                                                                    </pre>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>
                                            </td>
                                        </tr>
                                    )
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3 opacity-50">
                                            <Server className="h-12 w-12 text-muted-foreground" />
                                            <p className="text-sm font-medium mt-2">Nenhum evento registrado na trilha de auditoria.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
export const dynamic = 'force-dynamic'
