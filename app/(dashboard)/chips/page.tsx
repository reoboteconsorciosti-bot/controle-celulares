"use client"

import { useState, useEffect } from "react"
import useSWR, { mutate } from "swr"
import { Smartphone, Plus, Search, MoreVertical, Pencil, Trash2, Cpu as SimCardIcon, ShieldAlert, UserCircle, History, Clock } from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export default function ChipsPage() {
    const { data: sims, isLoading: swrLoading } = useSWR("/api/simcards")
    const [mounted, setMounted] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingSim, setEditingSim] = useState<any>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Delete Confirmation State
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
    const [simToDelete, setSimToDelete] = useState<number | null>(null)

    // History Modal State
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
    const [historySim, setHistorySim] = useState<any>(null)
    const [simHistory, setSimHistory] = useState<any>(null)
    const [isHistoryLoading, setIsHistoryLoading] = useState(false)

    const [addPhone, setAddPhone] = useState("")
    const [editPhone, setEditPhone] = useState("")

    useEffect(() => {
        setMounted(true)
    }, [])

    const applyPhoneMask = (val: string) => {
        let raw = val;
        // Se a string comecar com +55 (ou partes disso ao apagar), vamos limpar o +55 para nao duplicar
        if (raw.startsWith("+55")) {
            raw = raw.substring(3);
        } else if (raw.startsWith("55") && raw.replace(/\D/g, "").length >= 12) {
            raw = raw.substring(2);
        }

        let digits = raw.replace(/\D/g, "");
        digits = digits.substring(0, 11);

        let formatted = "";
        if (digits.length > 0) {
            formatted = "+55 (" + digits.substring(0, 2);
            if (digits.length > 2) {
                let rest = digits.substring(2);
                formatted += ") " + rest.substring(0, 5);
                if (rest.length > 5) {
                    formatted += "-" + rest.substring(5, 9);
                }
            }
        }
        return formatted;
    }

    const isLoading = swrLoading || !mounted

    const filteredSims = sims?.filter((sim: any) =>
        sim.phoneNumber.includes(searchTerm) ||
        (sim.planType === 'reobote' ? 'reobote corporativo' : 'pessoal privado').includes(searchTerm.toLowerCase())
    ) || []

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>, isEdit: boolean) => {
        e.preventDefault()
        setIsSubmitting(true)
        const formData = new FormData(e.currentTarget)

        const rawPhone = formData.get("phoneNumber") as string;
        if (rawPhone.length < 19) {
            toast.error("Número de telefone inválido.", { description: "Use o formato completo: +55 (XX) 9XXXX-XXXX" });
            setIsSubmitting(false)
            return;
        }

        const payload: any = {
            phoneNumber: rawPhone,
            iccid: formData.get("iccid") || null,
            planType: formData.get("planType") || "reobote",
            planDetails: formData.get("planDetails") || null,
        }

        if (isEdit && editingSim) {
            payload.id = editingSim.id
        }

        try {
            const url = isEdit ? `/api/simcards?id=${editingSim.id}` : "/api/simcards"
            const method = isEdit ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error("Erro ao salvar")

            toast.success(isEdit ? "Chip atualizado!" : "Chip adicionado!")
            mutate("/api/simcards")

            if (isEdit) {
                setIsEditModalOpen(false)
                setEditingSim(null)
            } else {
                setIsAddModalOpen(false)
            }
        } catch (error) {
            toast.error("Ocorreu um erro ao salvar o chip.")
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const confirmDelete = (id: number) => {
        setSimToDelete(id)
        setIsDeleteConfirmOpen(true)
    }

    const executeDelete = async () => {
        if (!simToDelete) return
        setIsSubmitting(true)
        try {
            const res = await fetch(`/api/simcards?id=${simToDelete}`, { method: "DELETE" })
            if (!res.ok) {
                throw new Error("Erro ao deletar")
            }
            toast.success("Chip removido.")
            mutate("/api/simcards")
            setIsDeleteConfirmOpen(false)
            setSimToDelete(null)
        } catch (error: any) {
            toast.error("Nao eh possivel remover chips atrelados a equipamentos em uso.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const openHistory = async (sim: any) => {
        setHistorySim(sim)
        setSimHistory(null)
        setIsHistoryModalOpen(true)
        setIsHistoryLoading(true)
        try {
            const res = await fetch(`/api/simcards/${sim.id}/history`)
            if (res.ok) {
                const data = await res.json()
                setSimHistory(data)
            } else {
                toast.error("Erro ao buscar histórico.")
            }
        } catch (error) {
            console.error(error)
            toast.error("Falha na comunicação ao buscar histórico.")
        } finally {
            setIsHistoryLoading(false)
        }
    }

    return (
        <div className="flex flex-col gap-8 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground/90">
                        Chips e Linhas
                    </h2>
                    <p className="text-[15px] text-muted-foreground">
                        Controle os numeros de telefone celular da corporacao.
                    </p>
                </div>

                <Dialog open={isAddModalOpen} onOpenChange={(open) => {
                    if (open) setAddPhone("");
                    setIsAddModalOpen(open);
                }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 shadow-sm rounded-lg" size="lg">
                            <Plus className="h-4 w-4" /> Nova Linha
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Cadastrar Chip</DialogTitle>
                            <DialogDescription>
                                Insira os dados do cartao SIM para envia-lo a equipamentos atribuidos.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => onSubmit(e, false)} className="space-y-4 pt-4">

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phoneNumber">Numero (Telefone) *</Label>
                                    <Input
                                        id="phoneNumber"
                                        name="phoneNumber"
                                        placeholder="+55 (XX) 9XXXX-XXXX"
                                        required
                                        maxLength={19}
                                        value={addPhone}
                                        onChange={(e) => setAddPhone(applyPhoneMask(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="planType">Tipo de Plano *</Label>
                                    <Select name="planType" required defaultValue="reobote">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tipo de Plano" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="reobote">Plano Reobote</SelectItem>
                                            <SelectItem value="pessoal">Pessoal / Privado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="iccid">ICCID (Numero do Chip Tras)</Label>
                                <Input id="iccid" name="iccid" placeholder="8955..." />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="planDetails">Detalhes do Plano</Label>
                                <Input id="planDetails" name="planDetails" placeholder="Ex: Controle 15GB" />
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Cadastrando..." : "Cadastrar Linha"}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="card-premium flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-border/40 bg-muted/10">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Buscar por numero..."
                            className="w-full bg-background shadow-none appearance-none pl-9 rounded-lg"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="p-0 overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-[13px] text-muted-foreground uppercase bg-muted/30 border-b border-border/40">
                            <tr>
                                <th className="px-6 py-4 font-semibold tracking-wide">Linha</th>
                                <th className="px-6 py-4 font-semibold tracking-wide">Detalhes e ICCID</th>
                                <th className="px-6 py-4 font-semibold tracking-wide">Status</th>
                                <th className="px-6 py-4 font-semibold tracking-wide text-right">Acoes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4"><Skeleton className="h-10 w-[160px]" /></td>
                                        <td className="px-6 py-4"><Skeleton className="h-6 w-[180px]" /></td>
                                        <td className="px-6 py-4"><Skeleton className="h-6 w-[80px]" /></td>
                                        <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></td>
                                    </tr>
                                ))
                            ) : filteredSims.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                        Nenhum chip / linha encontrada.
                                    </td>
                                </tr>
                            ) : (
                                filteredSims.map((sim: any) => (
                                    <tr key={sim.id} className="hover:bg-muted/10 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className={`h-10 w-10 flex items-center justify-center rounded-lg ${sim.planType === 'pessoal' ? 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'}`}>
                                                    <SimCardIcon className="h-4 w-4" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-foreground/90 text-[15px]">{sim.phoneNumber}</span>
                                                    <span className={`text-[10px] uppercase font-black tracking-wider mt-1 ${sim.planType === 'pessoal' ? 'text-zinc-500/80' : 'text-blue-500/80'}`}>
                                                        {sim.planType === 'pessoal' ? 'Pessoal/Privado' : 'Plano Reobote'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1 text-[13px]">
                                                {sim.planDetails ? <span className="text-foreground/80 font-medium">{sim.planDetails}</span> : <span className="text-muted-foreground/50">-</span>}
                                                {sim.iccid && <span className="text-muted-foreground text-[11px] font-mono tracking-wide mt-0.5">ICCID: {sim.iccid}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1.5 items-start">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${sim.status === 'available'
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                    : 'bg-primary/10 text-primary'
                                                    }`}>
                                                    {sim.status === 'available' ? 'Disponivel' : 'Em Uso'}
                                                </span>
                                                {sim.status === 'in_use' && sim.allocations?.[0]?.user && (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium bg-muted/40 px-2 py-0.5 rounded-sm">
                                                        <UserCircle className="h-3.5 w-3.5 text-blue-500" />
                                                        <span className="truncate max-w-[120px]" title={sim.allocations[0].user.name}>
                                                            {sim.allocations[0].user.name.split(' ')[0]}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setEditingSim(sim)
                                                        setEditPhone(applyPhoneMask(sim.phoneNumber))
                                                        setIsEditModalOpen(true)
                                                    }}
                                                    className="h-8 gap-1.5 px-3 rounded-lg text-primary hover:text-primary hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" /> <span className="hidden sm:inline font-bold">Editar</span>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openHistory(sim)}
                                                    className="h-8 gap-1.5 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border transition-all"
                                                >
                                                    <History className="h-3.5 w-3.5" /> <span className="hidden sm:inline font-bold">Historico</span>
                                                </Button>
                                                {sim.status === 'available' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => confirmDelete(sim.id)}
                                                        className="h-8 w-8 ml-2 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 transition-all border border-transparent hover:border-destructive/20"
                                                        title="Desativar"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL DE EDICAO */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Editar Chip</DialogTitle>
                    </DialogHeader>
                    {editingSim && (
                        <form onSubmit={(e) => onSubmit(e, true)} className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-phoneNumber">Numero (Telefone) *</Label>
                                    <Input
                                        id="edit-phoneNumber"
                                        name="phoneNumber"
                                        placeholder="+55 (XX) 9XXXX-XXXX"
                                        required
                                        maxLength={19}
                                        value={editPhone}
                                        onChange={(e) => setEditPhone(applyPhoneMask(e.target.value))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-planType">Tipo de Plano *</Label>
                                    <Select name="planType" required defaultValue={editingSim.planType || "reobote"}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Tipo de Plano" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="reobote">Plano Reobote</SelectItem>
                                            <SelectItem value="pessoal">Pessoal / Privado</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-iccid">ICCID (Numero do Chip Tras)</Label>
                                <Input id="edit-iccid" name="iccid" defaultValue={editingSim.iccid || ""} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-planDetails">Detalhes do Plano</Label>
                                <Input id="edit-planDetails" name="planDetails" defaultValue={editingSim.planDetails || ""} />
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Salvando..." : "Salvar Alteracoes"}
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* HISTORY MODAL */}
            <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
                <DialogContent className="sm:max-w-[550px] max-h-[85vh] flex flex-col overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <History className="h-5 w-5 text-primary" />
                            Historico da Linha
                        </DialogTitle>
                        <DialogDescription>
                            Rastreio completo de todas as sessoes de uso e bloqueios deste chip.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto pr-2 pb-4 pt-2">
                        {isHistoryLoading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-20 w-full rounded-xl" />
                                <Skeleton className="h-20 w-full rounded-xl" />
                                <Skeleton className="h-20 w-full rounded-xl" />
                            </div>
                        ) : simHistory ? (
                            <div className="space-y-6">
                                {/* SIM Details Header */}
                                <div className="bg-muted/30 p-4 rounded-xl border border-border/50 flex flex-col gap-2 shadow-sm">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-10 w-10 flex items-center justify-center rounded-lg ${simHistory.planType === 'pessoal' ? 'bg-zinc-500/10 text-zinc-600' : 'bg-blue-500/10 text-blue-600'}`}>
                                                <SimCardIcon className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-lg leading-tight">{simHistory.phoneNumber}</h4>
                                                <p className={`text-[10px] uppercase font-black tracking-wider mt-1 ${simHistory.planType === 'pessoal' ? 'text-zinc-500/80' : 'text-blue-500/80'}`}>
                                                    {simHistory.planType === 'pessoal' ? 'Pessoal/Privado' : 'Plano Reobote'}
                                                </p>
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold ${simHistory.status === 'available' ? 'bg-emerald-500/10 text-emerald-600' :
                                            simHistory.status === 'banned' ? 'bg-red-500/10 text-red-600' :
                                                'bg-primary/10 text-primary'
                                            }`}>
                                            {simHistory.status === 'available' ? 'Disponivel' :
                                                simHistory.status === 'banned' ? 'Bloqueado/Cancelado' : 'Em Uso'}
                                        </span>
                                    </div>
                                    {(simHistory.iccid || simHistory.planDetails) && (
                                        <div className="mt-2 text-sm text-muted-foreground/80 flex flex-col">
                                            {simHistory.iccid && <span><span className="font-medium">ICCID:</span> {simHistory.iccid}</span>}
                                            {simHistory.planDetails && <span><span className="font-medium">Plano:</span> {simHistory.planDetails}</span>}
                                        </div>
                                    )}
                                </div>

                                {/* Tracking Timeline */}
                                <div>
                                    <h4 className="text-sm font-bold text-foreground/80 mb-4 px-1 uppercase tracking-wider">Linha do Tempo de Usuarios</h4>

                                    {(!simHistory.allocations || simHistory.allocations.length === 0) ? (
                                        <div className="text-center p-8 border border-dashed rounded-xl border-border/60">
                                            <p className="text-muted-foreground text-sm font-medium">Este chip nunca foi atribuido a ninguem.</p>
                                        </div>
                                    ) : (
                                        <div className="relative border-l-2 border-primary/20 ml-3 pl-6 space-y-8">
                                            {simHistory.allocations.map((alloc: any, index: number) => (
                                                <div key={alloc.id} className="relative">
                                                    {/* Timeline Dot */}
                                                    <div className={`absolute -left-[31px] top-1.5 h-4 w-4 rounded-full border-4 border-background ${alloc.status === 'active' ? 'bg-primary' : 'bg-muted-foreground/40'}`}></div>

                                                    <div className={`bg-muted/20 border border-border/50 rounded-xl p-4 transition-all duration-200 ${alloc.status === 'active' ? 'shadow-sm border-primary/30 bg-primary/5' : 'opacity-80'}`}>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <UserCircle className={`h-4 w-4 ${alloc.status === 'active' ? 'text-primary' : 'text-muted-foreground'}`} />
                                                                <span className="font-bold text-sm text-foreground/90">{alloc.user?.name || "Usuario Desconhecido"}</span>
                                                                {alloc.status === 'active' && <span className="text-[10px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-sm uppercase tracking-wide ml-2">Ativo</span>}
                                                            </div>
                                                            <div className="text-xs font-semibold text-muted-foreground/80 bg-background px-2 py-1 rounded-md border border-border/40 shadow-sm whitespace-nowrap">
                                                                {format(new Date(alloc.deliveryDate || alloc.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                                                                {alloc.returnDate && `  ate  ${format(new Date(alloc.returnDate), "dd/MM/yyyy", { locale: ptBR })}`}
                                                            </div>
                                                        </div>

                                                        <div className="flex flex-col gap-1 text-[13px] text-muted-foreground mt-3 bg-background border border-border/50 rounded-lg p-3">
                                                            <div className="flex items-center gap-2">
                                                                <Smartphone className="h-3.5 w-3.5 opacity-70" />
                                                                <span className="font-medium">Aparelho Vinculado: <span className="text-foreground/80">{alloc.asset?.model || "Desconhecido"}</span></span>
                                                            </div>
                                                            {alloc.deliveryNotes && (
                                                                <div className="mt-2 text-xs italic opacity-80 border-l-2 border-primary/30 pl-2">
                                                                    "{alloc.deliveryNotes}"
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-10 text-destructive font-medium">Erro ao carregar os dados.</div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* DELETE MODAL */}
            <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <DialogContent className="sm:max-w-[400px] text-center p-6 rounded-3xl">
                    <DialogHeader className="flex flex-col items-center justify-center space-y-4">
                        <div className="h-16 w-16 bg-red-500/10 text-red-600 rounded-full flex items-center justify-center mb-2 mx-auto">
                            <ShieldAlert className="h-8 w-8" />
                        </div>
                        <DialogTitle className="text-xl font-black">Remover Chip / Linha</DialogTitle>
                        <DialogDescription className="text-center font-medium">
                            Tem certeza que deseja remover este chip da base?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-4 justify-center w-full pt-6 sm:justify-center">
                        <Button
                            variant="ghost"
                            className="rounded-xl flex-1 font-bold h-12"
                            onClick={() => setIsDeleteConfirmOpen(false)}
                        >
                            <span className="opacity-80">Cancelar</span>
                        </Button>
                        <Button
                            variant="destructive"
                            className="rounded-xl flex-1 font-bold h-12 shadow-lg shadow-red-500/20"
                            onClick={executeDelete}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Removendo..." : "Confirmar Exclusão"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
