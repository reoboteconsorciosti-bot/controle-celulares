"use client"

import { useState, useEffect } from "react"
import useSWR, { mutate } from "swr"
import {
    Users, Plus, Search, Pencil, Trash2, MapPin,
    LayoutList, Table, Smartphone, ShieldCheck, Cpu,
    EyeOff, Lock, Copy, Check, ChevronRight, ShieldAlert, KeyRound, CheckCircle2, XCircle, History, CalendarDays, Clock
} from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

// Parser para transformar logs JSON em texto legível
function formatAuditLogMessage(log: any) {
    const { action, tableName, oldData, newData } = log;
    const truncate = (str: string, max = 20) => str && str.length > max ? str.substring(0, max) + '...' : str;

    if (tableName === 'users') {
        if (action === 'INSERT') return `Colaborador cadastrado no sistema.`;
        if (action === 'DELETE') return `Colaborador excluído do sistema.`;

        if (action === 'UPDATE') {
            const changes = [];
            if (oldData?.name !== newData?.name) changes.push(`nome para "${truncate(newData?.name)}"`);
            if (oldData?.department !== newData?.department) changes.push(`setor para "${truncate(newData?.department) || 'Nenhum'}"`);
            if (oldData?.email !== newData?.email && newData?.email) changes.push(`e-mail para "${truncate(newData?.email)}"`);
            if (oldData?.active !== newData?.active) changes.push(`status para ${newData?.active ? '"Ativo"' : '"Inativo"'}`);

            if (changes.length > 0) return `Alterou ${changes.join(', ')}.`;
            return `Perfil do colaborador atualizado.`;
        }
    }

    if (tableName === 'credentials') {
        const system = newData?.system || oldData?.system;
        if (action === 'INSERT') return `Credencial criada no ${system} (Login: ${truncate(newData?.username)}).`;
        if (action === 'DELETE') return `Credencial removida do ${system}.`;
        if (action === 'UPDATE') {
            if (oldData?.password !== newData?.password && oldData?.username === newData?.username) return `Senha do ${system} alterada.`;
            if (oldData?.username !== newData?.username) return `Login do ${system} alterado para "${truncate(newData?.username)}".`;
            return `Credencial do ${system} atualizada.`;
        }
    }

    if (tableName === 'allocations') {
        if (action === 'INSERT') return `Equipamento alocado ao colaborador.`;
        if (action === 'UPDATE') {
            if (oldData?.status === 'active' && newData?.status === 'returned') return `Equipamento devolvido ao estoque.`;
            return `Atribuição de equipamento alterada.`;
        }
        if (action === 'DELETE') return `Alocação de equipamento apagada.`;
    }

    return `Registro modificado no sistema.`;
}


export default function ColaboradoresPage() {
    const { data: users, isLoading: swrLoading } = useSWR("/api/users")
    const [mounted, setMounted] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingUser, setEditingUser] = useState<any>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Smart Auto-fill States
    const [consultantName, setConsultantName] = useState("")
    const [autoEmail, setAutoEmail] = useState("")
    const [autoAgendor, setAutoAgendor] = useState("")
    const [autoGmail, setAutoGmail] = useState("vendedorrbt@gmail.com")
    const [addRole, setAddRole] = useState("Consultor")
    const [editRole, setEditRole] = useState("Consultor")
    const [viewMode, setViewMode] = useState<"list" | "sheets">("sheets")
    const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "borrowed" | "all">("active")
    const [summaryUser, setSummaryUser] = useState<any>(null)
    const [isSummaryOpen, setIsSummaryOpen] = useState(false)

    // States for Unified Sheets (Passwords)
    const [revealedPasswords, setRevealedPasswords] = useState<Record<number, string>>({})
    const [showAllPasswords, setShowAllPasswords] = useState(false)
    const [masterPassModalOpen, setMasterPassModalOpen] = useState(false)
    const [masterPassInput, setMasterPassInput] = useState("")
    const [verifyingMaster, setVerifyingMaster] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    // Quick Actions States
    const [isAllocModalOpen, setIsAllocModalOpen] = useState(false)
    const [isCredModalOpen, setIsCredModalOpen] = useState(false)
    const [isReturnConfirmOpen, setIsReturnConfirmOpen] = useState(false)
    const [returnTarget, setReturnTarget] = useState<any>(null)
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [selectedSystem, setSelectedSystem] = useState<string | null>(null)
    const [editingCredential, setEditingCredential] = useState<any>(null)

    // Delete Confirmation State
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
    const [userToDelete, setUserToDelete] = useState<number | null>(null)

    // Data for selectors
    const { data: assets } = useSWR("/api/assets")
    const { data: simCards } = useSWR("/api/simcards")

    // History data
    const { data: historyLogs, isLoading: isLoadingHistory } = useSWR(isSummaryOpen && summaryUser ? `/api/users/${summaryUser.id}/history` : null, fetcher)

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleViewModeChange = (mode: "list" | "sheets") => {
        setViewMode(mode)
    }

    const isLoading = swrLoading || !mounted

    if (!mounted) {
        return null // Avoid Radix UI hydration mismatches
    }

    const filteredUsers = Array.isArray(users)
        ? users.filter((user: any) => {
            // 1. Status Filter
            if (statusFilter === "active" && !user.active) return false;
            if (statusFilter === "inactive" && user.active) return false;
            if (statusFilter === "borrowed" && !user.allocations?.some((a: any) => a.status === 'active' && a.isLoan)) return false;

            // 2. Search Filter
            const searchLower = searchTerm.toLowerCase()
            const hasAsset = user.allocations?.some((a: any) => a.asset?.model.toLowerCase().includes(searchLower) || a.asset?.imei2?.includes(searchTerm))
            const hasSim = user.allocations?.some((a: any) => a.simCard?.phoneNumber.includes(searchTerm))
            const hasCredential = user.credentials?.some((c: any) => c.system.toLowerCase().includes(searchLower) || c.username.toLowerCase().includes(searchLower))

            return user.name.toLowerCase().includes(searchLower) ||
                user.location?.toLowerCase().includes(searchLower) ||
                user.role?.toLowerCase().includes(searchLower) ||
                hasAsset || hasSim || hasCredential
        })
        : []

    const ROLES = ["Consultor", "Supervisor", "Gerente", "TI", "Administrativo", "Sócio"]
    const activeSupervisors = Array.isArray(users) ? users.filter((u: any) => u.active && u.role === "Supervisor") : []

    // Get unique systems for Sheets columns
    const rawSystems = Array.from(new Set<string>(
        Array.isArray(users) ? users.flatMap((u: any) => u.credentials?.map((c: any) => c.system === "Gmail" ? "Google" : c.system) || []) : []
    )).sort()

    const allSystems = [...rawSystems.filter(s => s !== "Botconversa")]
    if (rawSystems.includes("Botconversa")) allSystems.push("Botconversa")

    // Live reference to selectedUser so that mutations instantly reflect in modals
    const liveSelectedUser = Array.isArray(users) && selectedUser
        ? users.find((u: any) => u.id === selectedUser.id) || selectedUser
        : selectedUser;

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>, isEdit: boolean) => {
        e.preventDefault()
        setIsSubmitting(true)
        const formData = new FormData(e.currentTarget)

        const isActiveInput = formData.get("active")
        const isActive = isActiveInput === "on" || isActiveInput === "true"

        const payload: any = {
            name: formData.get("name"),
            email: formData.get("email") || null,
            location: formData.get("location") || null,
            role: formData.get("role") || "Consultor",
            supervisorId: formData.get("supervisorId") ? Number(formData.get("supervisorId")) : null,
            active: isActive
        }

        // Add auto-generated credentials if creating a new user
        if (!isEdit) {
            payload.agendorUser = formData.get("agendorUser") || null;
            payload.gmailUser = formData.get("gmailUser") || null;
        }

        try {
            const url = isEdit ? `/api/users?id=${editingUser.id}` : "/api/users"
            const method = isEdit ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || "Erro ao salvar")
            }

            toast.success(isEdit ? "Colaborador atualizado!" : "Colaborador adicionado!")
            mutate("/api/users")

            if (isEdit) {
                setIsEditModalOpen(false)
                setEditingUser(null)
            } else {
                setIsAddModalOpen(false)
                // Reset smart fields
                setConsultantName("")
                setAutoEmail("")
                setAutoAgendor("")
                setAutoGmail("vendedorrbt@gmail.com")
            }
        } catch (error: any) {
            toast.error(error.message || "Ocorreu um erro ao salvar o colaborador.")
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const confirmDelete = (id: number) => {
        setUserToDelete(id)
        setIsDeleteConfirmOpen(true)
    }

    const executeDelete = async () => {
        if (!userToDelete) return

        setIsSubmitting(true)
        try {
            const res = await fetch(`/api/users?id=${userToDelete}`, { method: "DELETE" })
            if (!res.ok) {
                const errorData = await res.json()
                throw new Error(errorData.error || "Erro ao deletar")
            }
            toast.success("Colaborador removido com sucesso.")
            mutate("/api/users")
            setIsDeleteConfirmOpen(false)
            setUserToDelete(null)
        } catch (error: any) {
            toast.error(error.message || "Ocorreu um erro ao excluir.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value
        setConsultantName(name)

        const parts = name.trim().split(/\s+/)
        if (parts.length >= 2) {
            const firstName = parts[0].toLowerCase().replace(/[^a-z0-9]/g, '')
            const lastName = parts[parts.length - 1].toLowerCase().replace(/[^a-z0-9]/g, '')
            const formatted = `${firstName}.${lastName}`

            setAutoEmail(`${formatted}@reoboteconsorcios.com.br`)
            setAutoAgendor(formatted)
        } else {
            setAutoEmail("")
            setAutoAgendor("")
        }
    }

    async function togglePassword(id: number) {
        if (revealedPasswords[id]) {
            const newRevealed = { ...revealedPasswords }
            delete newRevealed[id]
            setRevealedPasswords(newRevealed)
            return
        }

        try {
            const res = await fetch(`/api/credentials/${id}`)
            if (!res.ok) throw new Error()
            const data = await res.json()
            setRevealedPasswords((prev) => ({ ...prev, [id]: data.password }))
        } catch {
            toast.error("Erro ao buscar senha ou sem permissao.")
        }
    }

    async function copyToClipboard(text: string, id: string) {
        try {
            await navigator.clipboard.writeText(text)
            setCopiedId(id)
            toast.success("Copiado!", { duration: 1500 })
            setTimeout(() => setCopiedId(null), 2000)
        } catch {
            toast.error("Erro ao copiar")
        }
    }

    const handleVerifyMaster = async () => {
        setVerifyingMaster(true)
        try {
            const res = await fetch("/api/auth/verify-master", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password: masterPassInput })
            })

            if (res.ok) {
                setShowAllPasswords(true)
                setMasterPassModalOpen(false)
                setMasterPassInput("")
                toast.success("Acesso total liberado!")
            } else {
                toast.error("Chave Mestra incorreta!")
            }
        } catch {
            toast.error("Erro ao verificar senha.")
        } finally {
            setVerifyingMaster(false)
        }
    }

    const toggleAllPasswords = () => {
        if (showAllPasswords) {
            setShowAllPasswords(false)
        } else {
            setMasterPassModalOpen(true)
        }
    }

    const handleQuickAlloc = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        const formData = new FormData(e.currentTarget)
        const assetIdRaw = formData.get("assetId")
        const assetId = (assetIdRaw && Number(assetIdRaw) > 0) ? Number(assetIdRaw) : null
        const simCardId = formData.get("simCardId") ? Number(formData.get("simCardId")) : null

        if ((!assetId || assetId <= 0 || isNaN(assetId)) && !simCardId) {
            toast.error("Por favor, selecione um equipamento ou uma linha válida.")
            setIsSubmitting(false)
            return
        }

        // Validações de Duplicidade
        const activeAllocations = selectedUser?.allocations?.filter((a: any) => a.status === 'active') || []

        // 1. Verificar se já tem o mesmo hardware
        if (activeAllocations.some((a: any) => a.assetId === assetId)) {
            toast.error("Este equipamento já está vinculado a este colaborador.")
            setIsSubmitting(false)
            return
        }

        // 2. Verificar se já tem o mesmo SIM Card (por ID ou Número)
        if (simCardId) {
            const selectedSim = simCards?.find((s: any) => s.id === simCardId)
            const hasConflict = activeAllocations.some((a: any) =>
                a.simCardId === simCardId ||
                (selectedSim && a.simCard?.phoneNumber === selectedSim.phoneNumber) ||
                (selectedSim?.iccid && a.simCard?.iccid === selectedSim.iccid)
            )

            if (hasConflict) {
                toast.error("O colaborador já possui um chip com este mesmo número ou ICCID ativo.")
                setIsSubmitting(false)
                return
            }
        }

        const payload = {
            userId: selectedUser.id,
            assetId,
            simCardId,
            deliveryDate: new Date().toISOString().split("T")[0],
            isLoan: false,
            accessories: {},
            deliveryNotes: "Atribuição rápida via Painel de Colaboradores"
        }

        try {
            const res = await fetch("/api/allocations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })
            if (!res.ok) throw new Error("Erro ao salvar atribuição")
            toast.success("Equipamento vinculado com sucesso!")
            mutate("/api/users")
            setIsAllocModalOpen(false)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleQuickReturn = async () => {
        if (!returnTarget) return
        setIsSubmitting(true)
        try {
            const res = await fetch("/api/allocations/return", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: returnTarget.id,
                    returnDate: new Date().toISOString().split("T")[0],
                    returnNotes: "Finalizado via Painel de Colaboradores (Quick Return)"
                })
            })

            if (!res.ok) throw new Error("Erro ao finalizar atribuição")
            toast.success("Equipamento devolvido com sucesso!")
            mutate("/api/users")
            setIsReturnConfirmOpen(false)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsSubmitting(false)
            setReturnTarget(null)
        }
    }

    const handleQuickCred = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setIsSubmitting(true)
        const formData = new FormData(e.currentTarget)
        const payload = {
            id: editingCredential?.id,
            userId: selectedUser.id,
            system: selectedSystem,
            username: formData.get("username"),
            password: formData.get("password"),
            url: null
        }

        try {
            const method = editingCredential ? "PUT" : "POST"
            const res = await fetch("/api/credentials", {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })
            if (!res.ok) throw new Error("Erro ao salvar credencial")
            toast.success(editingCredential ? "Credencial atualizada!" : "Credencial adicionada!")
            mutate("/api/users")
            setIsCredModalOpen(false)
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="grid grid-cols-1 gap-4 pb-4 w-full">
            {/* CABECALHO PREMIUM */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/50 dark:bg-zinc-900/50 p-6 rounded-3xl border border-border/40 shadow-sm backdrop-blur-xl">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Users className="h-4 w-4 text-primary" />
                        </div>
                        <h2 className="text-2xl font-black tracking-tight text-foreground/90">
                            Colaboradores
                        </h2>
                    </div>
                    <p className="text-[15px] text-muted-foreground font-medium pl-1">
                        Gestão unificada de ativos.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex bg-zinc-100 dark:bg-zinc-800/80 p-1.5 rounded-2xl border border-border/40">
                        <Button
                            variant={viewMode === "list" ? "secondary" : "ghost"}
                            size="sm"
                            className={`h-9 gap-2 rounded-xl transition-all px-4 font-bold text-xs uppercase tracking-wider ${viewMode === "list" ? "shadow-md bg-white dark:bg-zinc-700" : ""}`}
                            onClick={() => handleViewModeChange("list")}
                        >
                            <LayoutList className="h-4 w-4" /> Cards
                        </Button>
                        <Button
                            variant={viewMode === "sheets" ? "secondary" : "ghost"}
                            size="sm"
                            className={`h-9 gap-2 rounded-xl transition-all px-4 font-bold text-xs uppercase tracking-wider ${viewMode === "sheets" ? "shadow-md bg-white dark:bg-zinc-700" : ""}`}
                            onClick={() => handleViewModeChange("sheets")}
                        >
                            <Table className="h-4 w-4" /> Sheets Unificado
                        </Button>
                    </div>

                    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 shadow-lg shadow-primary/20 rounded-2xl h-12 px-6 font-bold" size="lg">
                                <Plus className="h-5 w-5" /> Novo Usuário
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[400px] rounded-[2rem]">
                            <DialogHeader>
                                <DialogTitle suppressHydrationWarning className="text-2xl font-black">Adicionar Usuário</DialogTitle>
                                <DialogDescription>
                                    Inicie o cadastro para vincular ativos Reobote.
                                </DialogDescription>
                            </DialogHeader>
                            <form onSubmit={(e) => onSubmit(e, false)} className="space-y-3 sm:space-y-4 pt-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Nome Completo *</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        placeholder="Ex: João Silva"
                                        className="h-10 rounded-xl border-border/60 text-sm"
                                        value={consultantName}
                                        onChange={handleNameChange}
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="role" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Cargo *</Label>
                                        <select
                                            id="role"
                                            name="role"
                                            className="w-full h-10 px-3 rounded-xl border border-border/60 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                                            required
                                            value={addRole}
                                            onChange={(e) => setAddRole(e.target.value)}
                                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                                        >
                                            {ROLES.map(r => (
                                                <option key={r} value={r}>{r}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {addRole === "Consultor" && (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="supervisorId" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Supervisor (Opcional)</Label>
                                        <select
                                            id="supervisorId"
                                            name="supervisorId"
                                            className="w-full h-10 px-3 rounded-xl border border-border/60 bg-white dark:bg-zinc-950 text-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none"
                                            defaultValue=""
                                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' }}
                                        >
                                            <option value="">Sem Supervisor</option>
                                            {activeSupervisors.map((sup: any) => (
                                                <option key={sup.id} value={sup.id}>{sup.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div className="space-y-1.5">
                                    <Label htmlFor="email" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2">
                                        E-mail Corporativo
                                    </Label>
                                    <Input
                                        type="email"
                                        id="email"
                                        name="email"
                                        placeholder="nome.sobrenome@reoboteconsorcios.com.br"
                                        className="h-10 rounded-xl border-border/60 font-mono text-sm"
                                        value={autoEmail}
                                        onChange={(e) => setAutoEmail(e.target.value)}
                                    />
                                </div>

                                {/* SMART CREDENTIAL FIELDS */}
                                <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">Credenciais Automáticas</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1.5">
                                            <Label htmlFor="agendorUser" className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">Usuário Agendor</Label>
                                            <Input
                                                id="agendorUser"
                                                name="agendorUser"
                                                placeholder="nome.sobrenome"
                                                className="h-9 rounded-lg border-primary/20 bg-white dark:bg-zinc-950 font-mono text-xs"
                                                value={autoAgendor}
                                                onChange={(e) => setAutoAgendor(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="gmailUser" className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground ml-1">E-mail Gmail</Label>
                                            <Input
                                                type="email"
                                                id="gmailUser"
                                                name="gmailUser"
                                                placeholder="vendedorrbt@gmail.com"
                                                className="h-9 rounded-lg border-primary/20 bg-white dark:bg-zinc-950 font-mono text-xs"
                                                value={autoGmail}
                                                onChange={(e) => setAutoGmail(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-muted-foreground italic pl-1 leading-relaxed">
                                        Edite os campos acima se necessário. As credenciais de sistema serão criadas automaticamente ao salvar.
                                    </p>
                                </div>

                                <div className="flex items-center space-x-3 pt-1 bg-muted/20 p-3 rounded-[1rem] border border-border/20">
                                    <Switch id="active" name="active" defaultChecked={true} className="scale-90" />
                                    <Label htmlFor="active" className="text-xs font-bold w-full cursor-pointer">Colaborador está ativo</Label>
                                </div>

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button type="button" variant="ghost" className="rounded-xl h-10 px-5 text-xs font-bold" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
                                    <Button type="submit" className="rounded-xl h-10 px-6 text-xs font-bold" disabled={isSubmitting}>
                                        {isSubmitting ? "Cadastrando..." : "Confirmar"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* INSIGHTS GLOBAIS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-zinc-900 border border-border/40 rounded-[1.5rem] p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Total de Cadastros</p>
                        <h3 className="text-2xl font-black text-foreground mt-0.5 pl-1">{Array.isArray(users) ? users.length : 0}</h3>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Users className="h-5 w-5" />
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-border/40 rounded-[1.5rem] p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-widest pl-1">Total de Consultores</p>
                        <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-0.5 pl-1">
                            {Array.isArray(users) ? users.filter((u: any) => !u.department || u.department.toLowerCase().includes('cons') || u.department.toLowerCase().includes('venda') || u.department.toLowerCase().includes('comercial')).length : 0}
                        </h3>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                        <Users className="h-5 w-5" />
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-border/40 rounded-[1.5rem] p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest pl-1">Usuários Ativos</p>
                        <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 pl-1">
                            {Array.isArray(users) ? users.filter((u: any) => u.active).length : 0}
                        </h3>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-border/40 rounded-[1.5rem] p-4 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Usuários Inativos</p>
                        <h3 className="text-2xl font-black text-muted-foreground mt-0.5 pl-1">
                            {Array.isArray(users) ? users.filter((u: any) => !u.active).length : 0}
                        </h3>
                    </div>
                    <div className="h-10 w-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-muted-foreground">
                        <XCircle className="h-5 w-5" />
                    </div>
                </div>
            </div>

            {/* TABELA E BUSCA UNIFICADA */}
            <div className="card-premium flex flex-col overflow-hidden bg-white/40 dark:bg-zinc-900/40 border border-border/40 shadow-2xl shadow-primary/5 rounded-[2rem] min-w-0">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between p-6 gap-6 border-b border-border/40 bg-white/20 dark:bg-zinc-800/20 backdrop-blur-md">
                    <div className="relative w-full max-w-[36rem] flex flex-col sm:flex-row gap-2">
                        <div className="relative w-full">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                            <Input
                                type="search"
                                placeholder="Pesquisar..."
                                className="w-full bg-white dark:bg-zinc-950 shadow-inner border-border/40 hover:border-primary/40 focus:border-primary/60 appearance-none pl-10 h-11 rounded-xl transition-all text-sm"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            className="w-full sm:w-44 shrink-0 h-11 pl-3 pr-8 rounded-xl border border-border/40 bg-white dark:bg-zinc-950 text-xs font-bold text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all outline-none appearance-none cursor-pointer shadow-inner"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1.2em' }}
                        >
                            <option value="active">Somente Ativos</option>
                            <option value="inactive">Somente Inativos</option>
                            <option value="borrowed">Aparelho Emprestado</option>
                            <option value="all">Mostrar Todos</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-4">
                        {viewMode === "sheets" && allSystems.length > 0 && (
                            <Button
                                variant={showAllPasswords ? "destructive" : "outline"}
                                className={`h-11 gap-2 rounded-xl font-bold text-xs uppercase transition-all px-5 ${!showAllPasswords ? "border-primary/40 hover:bg-primary/5 text-primary" : ""}`}
                                onClick={toggleAllPasswords}
                            >
                                {showAllPasswords ? <EyeOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                                {showAllPasswords ? "Ocultar Senhas" : "Exibir Senhas Reobote"}
                            </Button>
                        )}
                        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-border/30">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                            <span className="text-xs font-black uppercase tracking-widest text-foreground/70">
                                {filteredUsers.length} Usuários
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-0 overflow-x-auto relative max-h-[700px] border-t border-border/40">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="text-[11px] text-muted-foreground/60 uppercase tracking-[0.15em] bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-border/20 sticky top-0 z-30 backdrop-blur-md">
                            <tr>
                                <th className={`px-4 py-3 font-black sticky left-0 z-50 bg-zinc-50 dark:bg-zinc-900 border-r border-b border-border/20 ${viewMode === "sheets" ? "min-w-[280px]" : "w-auto"}`}>Consultor</th>
                                {viewMode === "sheets" ? (
                                    <>
                                        <th className="px-4 py-3 font-black min-w-[200px] border-b border-r border-border/20">Linha Reobote</th>
                                        <th className="px-4 py-3 font-black min-w-[240px] border-b border-r border-border/20">Equipamento</th>
                                        {allSystems.map(sys => (
                                            <th key={sys} className="px-4 py-3 font-black border-l border-b border-border/20 min-w-[260px]">{sys}</th>
                                        ))}
                                    </>
                                ) : (
                                    <th className="px-4 py-3 font-black border-b border-border/20">E-mail Corporativo</th>
                                )}
                                <th className="px-4 py-3 font-black text-right min-w-[100px] sticky right-0 z-50 bg-zinc-50 dark:bg-zinc-900 border-l border-b border-border/20">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-3"><Skeleton className="h-8 w-[150px]" /></td>
                                        <td className="px-4 py-3 text-center"><Skeleton className="h-6 w-[100px] mx-auto" /></td>
                                        <td className="px-4 py-3"><Skeleton className="h-6 w-[120px]" /></td>
                                        <td className="px-4 py-3 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></td>
                                    </tr>
                                ))
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={viewMode === "sheets" ? 4 + allSystems.length : 3} className="px-6 py-12 text-center text-muted-foreground">
                                        Nenhum colaborador encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user: any) => {
                                    const activeAllocation = user.allocations?.find((a: any) => a.status === 'active') || user.allocations?.[0]
                                    const hasChip = activeAllocation?.simCard

                                    return (
                                        <tr key={user.id} className="hover:bg-primary/[0.02] transition-colors group">
                                            <td
                                                className="px-4 py-3 whitespace-nowrap sticky left-0 bg-white dark:bg-zinc-900 border-r border-b border-border/20 z-40 shadow-[2px_0_10px_rgba(0,0,0,0.03)] group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800 transition-colors cursor-pointer"
                                                onClick={() => {
                                                    setSummaryUser(user)
                                                    setIsSummaryOpen(true)
                                                }}
                                                title="Ver Resumo e Histórico"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 flex flex-shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black text-[10px]">
                                                        {user.name.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="font-bold text-foreground/90 text-[14px] whitespace-nowrap">{user.name}</span>
                                                        {viewMode === "sheets" && !user.active && <span className="text-[10px] text-destructive/80 font-black uppercase tracking-tighter">Inativo</span>}
                                                        {viewMode === "sheets" && user.active && <span className="text-[10px] text-primary/70 font-black tracking-tighter uppercase whitespace-nowrap overflow-hidden text-ellipsis">{user.role || "Consultor"}</span>}
                                                    </div>
                                                </div>
                                            </td>

                                            {viewMode === "sheets" ? (
                                                <>
                                                    <td
                                                        className="px-4 py-3 whitespace-nowrap border-r border-b border-border/20 cursor-pointer hover:bg-primary/[0.05] transition-all relative group/cell"
                                                        onClick={() => {
                                                            setSelectedUser(user)
                                                            setIsAllocModalOpen(true)
                                                        }}
                                                    >
                                                        <div className="flex flex-col gap-2">
                                                            {user.allocations?.filter((a: any) => a.status === 'active' && a.simCard).length > 0 ? (
                                                                user.allocations.filter((a: any) => a.status === 'active' && a.simCard).map((a: any, idx: number) => (
                                                                    <div key={a.id} className={`flex items-center gap-2 ${idx > 0 ? "pt-2 border-t border-border/10" : ""}`}>
                                                                        <div className={`h-6 w-6 rounded flex items-center justify-center flex-shrink-0 ${a.simCard.planType === 'pessoal' ? 'bg-zinc-500/10 text-zinc-600' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                                                            <Cpu className="h-3 w-3" />
                                                                        </div>
                                                                        <div className="flex flex-col">
                                                                            <span className={`text-[12px] font-black font-mono ${a.simCard.planType === 'pessoal' ? 'text-zinc-600 dark:text-zinc-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                                                                {a.simCard.phoneNumber}
                                                                            </span>
                                                                            <span className={`text-[9px] uppercase font-black tracking-wider ${a.simCard.planType === 'pessoal' ? 'text-zinc-500/80' : 'text-blue-500/80'}`}>
                                                                                {a.simCard.planType === 'pessoal' ? 'Pessoal/Privado' : 'Plano Reobote'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <span className="text-muted-foreground/20 text-[11px] italic">Sem linha</span>
                                                            )}
                                                        </div>
                                                        <div className="absolute top-1 right-1 opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                                            <Plus className="h-2 w-2 text-primary/40" />
                                                        </div>
                                                    </td>
                                                    <td
                                                        className="px-4 py-3 whitespace-nowrap border-r border-b border-border/20 cursor-pointer hover:bg-primary/[0.05] transition-all relative group/cell"
                                                        onClick={() => {
                                                            setSelectedUser(user)
                                                            setIsAllocModalOpen(true)
                                                        }}
                                                    >
                                                        <div className="flex flex-col gap-2">
                                                            {user.allocations?.filter((a: any) => a.status === 'active').length > 0 ? (
                                                                user.allocations.filter((a: any) => a.status === 'active').map((a: any, idx: number) => (
                                                                    <div key={a.id} className={`flex flex-col gap-0 ${idx > 0 ? "pt-2 border-t border-border/10" : ""}`}>
                                                                        <span className="text-[13px] font-bold text-foreground/90 whitespace-nowrap">{a.asset?.model}</span>
                                                                        <span className="text-[11px] text-muted-foreground font-mono opacity-50 whitespace-nowrap">IMEI: {a.asset?.imei2 || "-"}</span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <span className="text-muted-foreground/20 text-[11px] italic">Sem ativo</span>
                                                            )}
                                                        </div>
                                                        <div className="absolute top-1 right-1 opacity-0 group-hover/cell:opacity-100 transition-opacity">
                                                            <Plus className="h-2 w-2 text-primary/40" />
                                                        </div>
                                                    </td>
                                                    {allSystems.map(sys => {
                                                        const cred = user.credentials?.find((c: any) => (sys === "Google" && (c.system === "Google" || c.system === "Gmail")) || c.system === sys)
                                                        return (
                                                            <td key={sys} className="p-0 border-r border-b border-border/20">
                                                                {cred ? (
                                                                    <div
                                                                        className="flex flex-col gap-1 p-2 h-full relative group/cell hover:bg-white dark:hover:bg-zinc-800 transition-all cursor-pointer border-2 border-transparent hover:border-primary/20 hover:shadow-xl"
                                                                        onDoubleClick={() => {
                                                                            setSelectedUser(user)
                                                                            setSelectedSystem(sys)
                                                                            setEditingCredential(cred)
                                                                            setIsCredModalOpen(true)
                                                                        }}
                                                                        title="Clique para copiar, Dublo clique para editar"
                                                                    >
                                                                        {/* Hover Icons */}
                                                                        <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover/cell:opacity-100 transition-opacity z-10">
                                                                            <div className="h-4 w-4 rounded bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center border border-border/40 shadow-sm">
                                                                                <Copy className="h-2 w-2 text-muted-foreground" />
                                                                            </div>
                                                                        </div>

                                                                        {/* User Cell */}
                                                                        <div
                                                                            className="flex items-center justify-between gap-1 p-0.5 rounded hover:bg-muted/40 transition-all"
                                                                            onClick={(e) => { e.stopPropagation(); copyToClipboard(cred.username, `sh-u-${cred.id}`); }}
                                                                        >
                                                                            <code className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{cred.username}</code>
                                                                            {copiedId === `sh-u-${cred.id}` && <Check className="h-2.5 w-2.5 text-green-500" />}
                                                                        </div>

                                                                        {/* Pass Cell */}
                                                                        <div
                                                                            className={`flex items-center justify-between gap-1 p-1 rounded border border-transparent transition-all ${showAllPasswords ? "bg-primary/5 border-primary/20" : "bg-muted/30"} hover:border-primary/40`}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                                const pass = showAllPasswords ? cred.password : revealedPasswords[cred.id]
                                                                                if (pass) {
                                                                                    copyToClipboard(pass, `sh-p-${cred.id}`)
                                                                                } else if (!showAllPasswords) {
                                                                                    togglePassword(cred.id)
                                                                                }
                                                                            }}
                                                                        >
                                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                                <KeyRound className={`h-2.5 w-2.5 ${showAllPasswords ? "text-primary" : "text-muted-foreground/30"}`} />
                                                                                <code className={`text-[11px] font-mono font-bold leading-none whitespace-nowrap ${showAllPasswords || revealedPasswords[cred.id] ? "text-primary text-[12px]" : "text-muted-foreground/20"}`}>
                                                                                    {showAllPasswords ? cred.password : (revealedPasswords[cred.id] || "••••••••")}
                                                                                </code>
                                                                            </div>
                                                                            {(showAllPasswords || revealedPasswords[cred.id]) && copiedId === `sh-p-${cred.id}` && <Check className="h-2.5 w-2.5 text-green-500" />}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div
                                                                        className="h-full min-h-[60px] bg-zinc-50/[0.02] dark:bg-zinc-900/[0.02] flex items-center justify-center cursor-pointer hover:bg-primary/[0.05] group/empty transition-all"
                                                                        onClick={() => {
                                                                            setSelectedUser(user)
                                                                            setSelectedSystem(sys)
                                                                            setEditingCredential(null)
                                                                            setIsCredModalOpen(true)
                                                                        }}
                                                                        title={`Vincular ${sys}`}
                                                                    >
                                                                        <Plus className="h-3 w-3 text-border/40 group-hover/empty:text-primary/40 transition-colors" />
                                                                    </div>
                                                                )}
                                                            </td>
                                                        )
                                                    })}
                                                </>
                                            ) : (
                                                <td className="px-4 py-3 whitespace-nowrap border-b border-border/20">
                                                    <span className="text-[13px] text-muted-foreground">{user.email || "-"}</span>
                                                </td>
                                            )}

                                            <td className="px-4 py-3 text-right bg-white dark:bg-zinc-900 sticky right-0 z-40 border-l border-b border-border/20 shadow-[-4px_0_12px_rgba(0,0,0,0.04)] group-hover:bg-zinc-50 dark:group-hover:bg-zinc-800 transition-colors">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 text-primary hover:bg-primary/10 rounded-md"
                                                        onClick={() => {
                                                            setEditingUser(user)
                                                            setEditRole(user.role || "Consultor")
                                                            setIsEditModalOpen(true)
                                                        }}
                                                    >
                                                        <Pencil className="h-3 w-3" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className={`h-7 w-7 rounded-md transition-colors ${(!user.allocations || user.allocations.length === 0) ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground/30 opacity-50 cursor-not-allowed"}`}
                                                        onClick={() => {
                                                            if (!user.allocations || user.allocations.length === 0) {
                                                                confirmDelete(user.id);
                                                            } else {
                                                                toast.error("Colaborador possui histórico!", {
                                                                    description: "Desative a chave 'Colaborador Ativo' editando o perfil, em vez de excluí-lo."
                                                                });
                                                            }
                                                        }}
                                                        title={(!user.allocations || user.allocations.length === 0) ? "Excluir Colaborador" : "Possui histórico. Use a inativação."}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MASTER PASSWORD MODAL */}
            <Dialog open={masterPassModalOpen} onOpenChange={setMasterPassModalOpen}>
                <DialogContent className="sm:max-w-[400px] border-2 border-primary/20 shadow-2xl rounded-[2.5rem] bg-white dark:bg-zinc-950">
                    <DialogHeader className="flex flex-col items-center justify-center pt-4">
                        <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center animate-pulse mb-4">
                            <ShieldCheck className="h-10 w-10 text-primary" />
                        </div>
                        <DialogTitle suppressHydrationWarning className="text-3xl font-black text-center">Protocolo de Acesso</DialogTitle>
                        <DialogDescription className="text-center font-medium mt-2">
                            Esta ação revelará **TODAS** as senhas da planilha. Insira a Chave Mestra.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-6 py-6 px-2">
                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-primary ml-1">Chave Mestra</Label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
                                <Input
                                    type="password"
                                    value={masterPassInput}
                                    onChange={(e) => setMasterPassInput(e.target.value)}
                                    placeholder="••••••••"
                                    className="h-16 pl-12 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-2 border-transparent focus-visible:border-primary/40 focus-visible:ring-0 transition-all text-xl font-mono tracking-widest"
                                    onKeyDown={(e) => e.key === "Enter" && handleVerifyMaster()}
                                    autoFocus
                                />
                            </div>
                        </div>
                        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3">
                            <ShieldAlert className="h-5 w-5 text-amber-500 flex-shrink-0 mt-1" />
                            <p className="text-[11px] font-bold text-amber-600 uppercase tracking-tight leading-tight">
                                Atenção: Você está prestes a carregar dados sensíveis Reobote. Use com responsabilidade.
                            </p>
                        </div>
                    </div>
                    <DialogFooter className="bg-primary/5 -mx-6 -mb-6 p-8 rounded-b-[2rem] flex flex-col sm:flex-row gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => { setMasterPassModalOpen(false); setMasterPassInput(""); }}
                            className="h-14 font-black uppercase text-xs tracking-widest"
                            disabled={verifyingMaster}
                        >
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleVerifyMaster}
                            disabled={verifyingMaster || !masterPassInput}
                            className="h-14 px-8 font-black uppercase text-xs tracking-[0.15em] shadow-xl shadow-primary/30 rounded-2xl flex-1 group"
                        >
                            {verifyingMaster ? "Validando..." : (
                                <>
                                    Liberar Tudo <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL DE EDICAO */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent className="sm:max-w-[400px] rounded-[2rem]">
                    <DialogHeader>
                        <DialogTitle suppressHydrationWarning>Editar Colaborador</DialogTitle>
                    </DialogHeader>
                    {editingUser && (
                        <form onSubmit={(e) => onSubmit(e, true)} className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Nome Completo *</Label>
                                <Input id="edit-name" name="name" defaultValue={editingUser.name} required />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-role">Cargo</Label>
                                    <select
                                        id="edit-role"
                                        name="role"
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none"
                                        required
                                        value={editRole}
                                        onChange={(e) => setEditRole(e.target.value)}
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1em' }}
                                    >
                                        {ROLES.map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {editRole === "Consultor" && (
                                <div className="space-y-2">
                                    <Label htmlFor="edit-supervisorId">Supervisor (Opcional)</Label>
                                    <select
                                        id="edit-supervisorId"
                                        name="supervisorId"
                                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 appearance-none"
                                        defaultValue={editingUser.supervisorId || ""}
                                        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1em' }}
                                    >
                                        <option value="">Sem Supervisor</option>
                                        {activeSupervisors.map((sup: any) => (
                                            <option key={sup.id} value={sup.id}>{sup.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="edit-email">E-mail</Label>
                                <Input type="email" id="edit-email" name="email" defaultValue={editingUser.email || ""} />
                            </div>

                            <div className="flex items-center space-x-2 pt-2">
                                <Switch id="edit-active" name="active" defaultChecked={editingUser.active} />
                                <Label htmlFor="edit-active">Colaborador ativo na empresa</Label>
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Salvando..." : "Salvar Alterações"}
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* MODAL DE RESUMO DO CONSULTOR */}
            <Dialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                    <DialogHeader className="border-b pb-4">
                        <div className="flex items-start justify-between w-full">
                            <div className="flex items-center gap-4">
                                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-2xl shadow-inner">
                                    {summaryUser?.name?.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <DialogTitle className="text-2xl font-black tracking-tight">{summaryUser?.name}</DialogTitle>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant={summaryUser?.active ? "default" : "secondary"} className={summaryUser?.active ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 shadow-none border-none pointer-events-none" : "pointer-events-none"}>
                                            {summaryUser?.active ? "Ativo" : "Inativo"}
                                        </Badge>
                                        <Badge variant="outline" className="border-primary/20 text-primary uppercase text-[9px] tracking-widest pointer-events-none">
                                            {summaryUser?.role || "Consultor"}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                                            <Clock className="h-3 w-3" /> Registrado em {new Date(summaryUser?.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {summaryUser?.supervisor && (
                                        <div className="text-[11px] text-muted-foreground mt-1.5 flex items-center gap-1.5 font-medium">
                                            Líder Direto: <span className="text-foreground">{summaryUser.supervisor.name}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-primary"
                                onClick={() => {
                                    setIsSummaryOpen(false)
                                    setEditingUser(summaryUser)
                                    setIsEditModalOpen(true)
                                }}
                            >
                                <Pencil className="h-3 w-3" /> Editar
                            </Button>
                        </div>
                    </DialogHeader>

                    <div className="py-2 space-y-8">
                        {/* ATIVOS ATUAIS */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                                <Smartphone className="h-4 w-4" /> Equipamentos Atuais
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {summaryUser?.allocations?.filter((a: any) => a.status === 'active').length > 0 ? (
                                    summaryUser.allocations.filter((a: any) => a.status === 'active').map((a: any) => (
                                        <div key={a.id} className="p-4 rounded-2xl border border-border/40 bg-zinc-50 dark:bg-zinc-900/50 space-y-2 relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-3">
                                                <Badge variant="outline" className="border-emerald-500/20 text-emerald-600 bg-emerald-500/5 text-[10px]">Em Uso</Badge>
                                            </div>
                                            <p className="font-bold text-foreground/90">{a.asset?.model}</p>
                                            <div className="flex flex-col gap-1 text-[11px] mt-2">
                                                <span className="text-muted-foreground">IMEI: <span className="text-foreground/80 font-mono">{a.asset?.imei2 || "N/A"}</span></span>
                                                {a.simCard && (
                                                    <span className="text-muted-foreground flex items-center gap-1">
                                                        <Cpu className="h-3 w-3 text-emerald-500" /> <span className="text-foreground/80 font-mono">{a.simCard.phoneNumber}</span>
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-1 sm:col-span-2 p-6 rounded-2xl border border-dashed border-border/60 bg-muted/20 text-center">
                                        <p className="text-sm text-muted-foreground italic">Nenhum equipamento em uso.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* CREDENCIAIS */}
                        <div className="space-y-4">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4" /> Acessos Cadastrados
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {summaryUser?.credentials?.length > 0 ? (
                                    summaryUser.credentials.map((cred: any) => (
                                        <div key={cred.id} className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-background text-[13px] shadow-sm">
                                            <span className="font-bold text-foreground/80">{cred.system}</span>
                                            <span className="text-muted-foreground font-mono truncate max-w-[100px]">{cred.username}</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-1 sm:col-span-2 p-4 rounded-xl border border-dashed border-border/40 text-center">
                                        <p className="text-xs text-muted-foreground italic">Sem registros no Cofre.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* HISTÓRICO GLOBAL (TIMELINE) */}
                        <div className="space-y-4 pt-4 border-t border-border/40">
                            <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground/70 flex items-center gap-2">
                                <History className="h-4 w-4" /> Histórico Completo de Ações
                            </h4>
                            <div className="space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border/30 before:to-transparent">
                                {isLoadingHistory ? (
                                    <div className="flex flex-col gap-4 py-4">
                                        <Skeleton className="h-16 w-full rounded-2xl" />
                                        <Skeleton className="h-16 w-full rounded-2xl" />
                                    </div>
                                ) : historyLogs && historyLogs.length > 0 ? (
                                    historyLogs.map((log: any, index: number) => (
                                        <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            {/* Icon */}
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white dark:border-zinc-950 bg-primary/10 text-primary shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                                                {log.tableName === 'users' ? <Users className="h-4 w-4" /> : log.tableName === 'credentials' ? <ShieldCheck className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
                                            </div>
                                            {/* Card */}
                                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-border/30 bg-zinc-50/50 dark:bg-zinc-900/50 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5">
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <span className="text-[12px] font-bold text-foreground/90 leading-tight flex-1 break-words whitespace-pre-wrap">
                                                            {formatAuditLogMessage(log)}
                                                        </span>
                                                        <Badge variant="outline" className={`text-[9px] uppercase tracking-widest bg-background flex-shrink-0 mt-0.5 ${log.action === 'INSERT' ? 'text-emerald-500 border-emerald-500/20' : log.action === 'DELETE' ? 'text-destructive border-destructive/20' : 'text-blue-500 border-blue-500/20'}`}>
                                                            {log.action}
                                                        </Badge>
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> {new Date(log.createdAt).toLocaleString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-6 rounded-2xl border border-dashed border-border/30 text-center bg-muted/10 relative z-10">
                                        <p className="text-sm text-muted-foreground italic">Nenhum registro de histórico encontrado.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t">
                            <Button onClick={() => setIsSummaryOpen(false)} className="w-full sm:w-auto rounded-xl">Fechar Resumo</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* QUICK ALLOCATION MODAL */}
            <Dialog open={isAllocModalOpen} onOpenChange={setIsAllocModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle suppressHydrationWarning>Gerenciar Ativos - {liveSelectedUser?.name}</DialogTitle>
                        <DialogDescription>
                            Veja os itens atuais ou vincule um novo equipamento.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 pt-4">
                        {/* Current Active Allocations */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                <Smartphone className="h-3.5 w-3.5" /> Ativos Atuais
                            </h4>
                            <div className="space-y-2">
                                {liveSelectedUser?.allocations?.filter((a: any) => a.status === 'active').length > 0 ? (
                                    liveSelectedUser.allocations.filter((a: any) => a.status === 'active').map((a: any) => (
                                        <div key={a.id} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-zinc-50/50 dark:bg-zinc-900/50">
                                            <div className="flex flex-col">
                                                <span className="text-[13px] font-bold text-foreground/90">{a.asset?.model}</span>
                                                {a.simCard && (
                                                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1">
                                                        <Cpu className="h-2 w-2" /> {a.simCard.phoneNumber}
                                                    </span>
                                                )}
                                                <span className="text-[10px] text-muted-foreground opacity-60">IMEI: {a.asset?.imei2 || "-"}</span>
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 px-2 text-destructive hover:bg-destructive/10 gap-1.5 font-bold text-[11px]"
                                                onClick={() => {
                                                    setReturnTarget(a)
                                                    setIsReturnConfirmOpen(true)
                                                }}
                                                disabled={isSubmitting}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" /> Devolver
                                            </Button>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center p-4 rounded-xl border border-dashed border-border/60 bg-muted/20">
                                        <p className="text-xs text-muted-foreground italic">Nenhum ativo vinculado no momento.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Add New Allocation */}
                        <div className="space-y-4 pt-4 border-t border-border/20">
                            <h4 className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                                <Plus className="h-3.5 w-3.5" /> Vincular Novo Aparelho
                            </h4>
                            <form onSubmit={(e) => {
                                // Prevent Enter key from auto-submitting the form if no submitter button was explicitly clicked
                                if (!(e.nativeEvent as SubmitEvent).submitter) {
                                    e.preventDefault();
                                    return;
                                }
                                handleQuickAlloc(e);
                            }} className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-bold uppercase text-muted-foreground ml-1">Aparelhos Livres no Estoque</Label>
                                    {(() => {
                                        const availableAssets = assets?.filter((a: any) => a.status === 'available');
                                        if (!availableAssets || availableAssets.length === 0) {
                                            return (
                                                <div className="flex flex-col items-center justify-center p-4 border border-dashed border-border/80 rounded-xl bg-muted/5">
                                                    <span className="text-[12px] font-medium text-muted-foreground mb-3 text-center">Não há aparelhos de empresa livres no estoque para um novo empréstimo.</span>
                                                    <Link href="/hardware" onClick={() => setIsAllocModalOpen(false)}>
                                                        <Button type="button" size="sm" variant="outline" className="h-8 px-4 text-xs font-bold gap-2 rounded-lg border-primary/20 text-primary hover:bg-primary/10 transition-colors">
                                                            <Plus className="h-3.5 w-3.5" /> Adicionar Equipamento
                                                        </Button>
                                                    </Link>
                                                </div>
                                            );
                                        }
                                        return (
                                            <select
                                                name="assetId"
                                                className="w-full h-11 px-3 rounded-xl border border-border/60 bg-white dark:bg-zinc-950 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                                defaultValue=""
                                            >
                                                <option value="" disabled>Selecione um hardware...</option>
                                                {availableAssets.map((a: any) => (
                                                    <option key={a.id} value={a.id} className="font-medium text-foreground">{a.model} - IMEI: {a.imei2 || "N/A"}</option>
                                                ))}
                                            </select>
                                        );
                                    })()}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[11px] font-bold uppercase text-muted-foreground ml-1">Linha Reobote (Opcional)</Label>
                                    {(() => {
                                        const availableSims = simCards?.filter((s: any) => s.status === 'available');
                                        if (!availableSims || availableSims.length === 0) {
                                            return (
                                                <div className="flex flex-col items-center justify-center p-4 border border-dashed border-border/80 rounded-xl bg-muted/5">
                                                    <span className="text-[12px] font-medium text-muted-foreground mb-3 text-center">Nenhuma linha disponível na base.</span>
                                                    <Link href="/chips" onClick={() => setIsAllocModalOpen(false)}>
                                                        <Button type="button" size="sm" variant="outline" className="h-8 px-4 text-xs font-bold gap-2 rounded-lg border-primary/20 text-primary hover:bg-primary/10 transition-colors">
                                                            <Plus className="h-3.5 w-3.5" /> Adicionar Linha
                                                        </Button>
                                                    </Link>
                                                </div>
                                            );
                                        }
                                        return (
                                            <select
                                                name="simCardId"
                                                className="w-full h-11 px-3 rounded-xl border border-border/60 bg-white dark:bg-zinc-950 text-sm font-medium focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                            >
                                                <option value="">Nenhuma linha</option>
                                                {availableSims.map((s: any) => (
                                                    <option key={s.id} value={s.id} className="font-medium text-foreground">{s.phoneNumber} ({s.carrier})</option>
                                                ))}
                                            </select>
                                        );
                                    })()}
                                </div>
                                {(() => {
                                    const availableAssets = assets?.filter((a: any) => a.status === 'available');
                                    const availableSims = simCards?.filter((s: any) => s.status === 'available');
                                    const hasStock = (availableAssets && availableAssets.length > 0) || (availableSims && availableSims.length > 0);

                                    if (!hasStock) {
                                        return (
                                            <div className="flex justify-end gap-2 pt-2">
                                                <Button type="button" variant="outline" className="rounded-xl h-10 px-4 font-bold" onClick={() => setIsAllocModalOpen(false)}>Fechar</Button>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button type="button" variant="ghost" className="rounded-xl h-10 px-4 font-bold" onClick={() => setIsAllocModalOpen(false)}>Cancelar</Button>
                                            <Button type="submit" className="rounded-xl h-10 px-6 font-black shadow-lg shadow-primary/20" disabled={isSubmitting}>
                                                {isSubmitting ? "Salvando..." : "Confirmar Vínculo"}
                                            </Button>
                                        </div>
                                    );
                                })()}
                            </form>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* QUICK CREDENTIAL MODAL */}
            <Dialog open={isCredModalOpen} onOpenChange={setIsCredModalOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle suppressHydrationWarning>{editingCredential ? "Editar Credencial" : "Nova Credencial"}</DialogTitle>
                        <DialogDescription>
                            Sistema: <span className="font-bold text-primary">{selectedSystem}</span> para {selectedUser?.name}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleQuickCred} className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <Label>Usuário / E-mail</Label>
                            <Input name="username" defaultValue={editingCredential?.username || ""} required placeholder="ex: joao@reobote.com" />
                        </div>
                        <div className="space-y-2">
                            <Label>Senha</Label>
                            <Input name="password" defaultValue={editingCredential?.password || ""} required placeholder="Digite a senha" />
                        </div>
                        <div className="flex justify-end gap-2 pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsCredModalOpen(false)}>Cancelar</Button>
                            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Salvar" : editingCredential ? "Atualizar" : "Adicionar"}</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
            {/* CONFIRM RETURN MODAL */}
            <Dialog open={isReturnConfirmOpen} onOpenChange={setIsReturnConfirmOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle suppressHydrationWarning className="flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-destructive" />
                            Confirmar Devolução
                        </DialogTitle>
                        <DialogDescription className="pt-3">
                            Tem certeza que deseja devolver o equipamento <strong>{returnTarget?.asset?.model}</strong> (IMEI: {returnTarget?.asset?.imei2 || "N/A"})?
                            <br /><br />
                            Isso removerá o vínculo com <strong>{selectedUser?.name}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="gap-3 sm:gap-4 pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsReturnConfirmOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleQuickReturn}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? "Processando..." : "Confirmar Devolução"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* DELETE CONFIRMATION MODAL */}
            <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <DialogContent className="sm:max-w-[400px] text-center p-6 rounded-3xl">
                    <DialogHeader className="flex flex-col items-center justify-center space-y-4">
                        <div className="h-16 w-16 bg-red-500/10 text-red-600 rounded-full flex items-center justify-center mb-2 mx-auto">
                            <ShieldAlert className="h-8 w-8" />
                        </div>
                        <DialogTitle suppressHydrationWarning className="text-xl font-black">Remover Colaborador</DialogTitle>
                        <DialogDescription className="text-center font-medium">
                            Tem certeza que deseja remover este colaborador? Essa acao so pode ser feita se ele nao possuir atribuicoes ativas no sistema.
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
