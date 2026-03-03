"use client"

import { useState, useEffect } from "react"
import useSWR, { mutate } from "swr"
import { Monitor, Smartphone, Plus, Search, MoreVertical, Pencil, Trash2, ShieldAlert, UserCircle } from "lucide-react"
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"

export default function HardwarePage() {
    const { data, isLoading: swrLoading } = useSWR("/api/assets")
    const [mounted, setMounted] = useState(false)
    const [searchTerm, setSearchTerm] = useState("")
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [editingAsset, setEditingAsset] = useState<any>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Delete Modal State
    const [isDeleteOpen, setIsDeleteOpen] = useState(false)
    const [assetToDelete, setAssetToDelete] = useState<number | null>(null)

    useEffect(() => {
        setMounted(true)
    }, [])

    const isLoading = swrLoading || !mounted

    // Filters
    const filteredAssets = data?.filter((asset: any) =>
        asset.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.imei2?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())
    ) || []

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>, isEdit: boolean) => {
        e.preventDefault()
        setIsSubmitting(true)
        const formData = new FormData(e.currentTarget)

        // Converte checkbox de novo para boolean se existir (apenas celular tem isso)
        const isNewCheckbox = formData.get("isNew")
        const payload: any = {
            type: formData.get("type"),
            model: formData.get("model"),
            imei2: formData.get("imei2"),
            condition: formData.get("condition"),
            status: formData.get("status"),
            observations: formData.get("observations") || null,
        }

        if (isEdit && editingAsset) {
            payload.id = editingAsset.id
        }

        if (payload.type === "celular") {
            payload.isNew = isNewCheckbox === "on"
        }

        try {
            const url = isEdit ? `/api/assets?id=${editingAsset.id}` : "/api/assets"
            const method = isEdit ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            })

            if (!res.ok) throw new Error("Erro ao salvar equipamento")

            toast.success(isEdit ? "Equipamento autalizado!" : "Equipamento adicionado com sucesso!")
            mutate("/api/assets") // Recarrega

            if (isEdit) {
                setIsEditModalOpen(false)
                setEditingAsset(null)
            } else {
                setIsAddModalOpen(false)
            }
        } catch (error) {
            toast.error("Ocorreu um erro.")
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const confirmDelete = (id: number) => {
        setAssetToDelete(id)
        setIsDeleteOpen(true)
    }

    const executeDelete = async () => {
        if (!assetToDelete) return
        setIsSubmitting(true)
        try {
            const res = await fetch(`/api/assets?id=${assetToDelete}`, { method: "DELETE" })
            if (!res.ok) throw new Error("Erro ao deletar")
            toast.success("Equipamento removido")
            mutate("/api/assets")
            setIsDeleteOpen(false)
            setAssetToDelete(null)
        } catch (error) {
            toast.error("Ocorreu um erro ao excluir.")
        } finally {
            setIsSubmitting(false)
        }
    }

    const TypeIcon = ({ type }: { type: string }) => {
        switch (type) {
            case "celular": return <Smartphone className="h-4 w-4" />
            case "tablet": return <Monitor className="h-4 w-4" />
            default: return <Monitor className="h-4 w-4" />
        }
    }

    return (
        <div className="flex flex-col gap-8 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground/90">
                        Equipamentos
                    </h2>
                    <p className="text-[15px] text-muted-foreground">
                        Gerencie o estoque de celulares e tablets corporativos.
                    </p>
                </div>

                <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 shadow-sm rounded-lg" size="lg">
                            <Plus className="h-4 w-4" /> Cadastrar Novo
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Novo Equipamento</DialogTitle>
                            <DialogDescription>
                                Adicione um celular ou tablet ao estoque.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={(e) => onSubmit(e, false)} className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="type">Tipo *</Label>
                                    <Select name="type" required defaultValue="celular">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="celular">Celular</SelectItem>
                                            <SelectItem value="tablet">Tablet</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="condition">Condicao *</Label>
                                    <Select name="condition" required defaultValue="bom">
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="novo">Novo</SelectItem>
                                            <SelectItem value="bom">Bom (Usado)</SelectItem>
                                            <SelectItem value="regular">Regular</SelectItem>
                                            <SelectItem value="ruim">Ruim / Defeito</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status Inicial *</Label>
                                <Select name="status" required defaultValue="available">
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="available">Disponivel</SelectItem>
                                        <SelectItem value="in_use">Em Uso</SelectItem>
                                        <SelectItem value="maintenance">Manutencao</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="model">Modelo / Nome *</Label>
                                <Input id="model" name="model" placeholder="Ex: Samsung Galaxy S23" required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="imei2">IMEI 2 *</Label>
                                <Input id="imei2" name="imei2" placeholder="Obrigatorio" required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="observations">Observacoes</Label>
                                <Textarea id="observations" name="observations" placeholder="Marcas de uso, etc..." />
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Salvando..." : "Salvar"}
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
                            placeholder="Buscar por modelo, IMEI..."
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
                                <th className="px-6 py-4 font-semibold tracking-wide">Equipamento</th>
                                <th className="px-6 py-4 font-semibold tracking-wide">Identificadores</th>
                                <th className="px-6 py-4 font-semibold tracking-wide">Status</th>
                                <th className="px-6 py-4 font-semibold tracking-wide">Condicao</th>
                                <th className="px-6 py-4 font-semibold tracking-wide text-right">Acoes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i}>
                                        <td className="px-6 py-4"><Skeleton className="h-6 w-[150px]" /></td>
                                        <td className="px-6 py-4"><Skeleton className="h-6 w-[120px]" /></td>
                                        <td className="px-6 py-4"><Skeleton className="h-6 w-[80px]" /></td>
                                        <td className="px-6 py-4"><Skeleton className="h-6 w-[80px]" /></td>
                                        <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-8 ml-auto rounded-md" /></td>
                                    </tr>
                                ))
                            ) : filteredAssets.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                                        Nenhum equipamento encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredAssets.map((asset: any) => (
                                    <tr key={asset.id} className="hover:bg-muted/10 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                    <TypeIcon type={asset.type} />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-foreground/90">{asset.model}</span>
                                                    <span className="text-[12px] text-muted-foreground capitalize">{asset.type}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1 text-[13px]">
                                                {asset.imei2 && <span className="text-muted-foreground/80"><span className="font-medium">IMEI 2:</span> {asset.imei2}</span>}
                                                {!asset.imei2 && <span className="text-muted-foreground/50">-</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1.5 items-start">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${asset.status === 'available'
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                    : asset.status === 'in_use'
                                                        ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                        : 'bg-destructive/10 text-destructive'
                                                    }`}>
                                                    {asset.status === 'available' ? 'Disponivel' : asset.status === 'in_use' ? 'Em Uso' : 'Manutencao'}
                                                </span>
                                                {asset.status === 'in_use' && asset.allocations?.[0]?.user && (
                                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground font-medium bg-muted/40 px-2 py-0.5 rounded-sm">
                                                        <UserCircle className="h-3.5 w-3.5 text-blue-500" />
                                                        <span className="truncate max-w-[120px]" title={asset.allocations[0].user.name}>
                                                            {asset.allocations[0].user.name.split(' ')[0]}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-muted-foreground capitalize">{asset.condition}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md hover:bg-muted">
                                                        <span className="sr-only">Abrir menu</span>
                                                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-[160px]">
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setEditingAsset(asset)
                                                            setIsEditModalOpen(true)
                                                        }}
                                                        className="cursor-pointer gap-2"
                                                    >
                                                        <Pencil className="h-4 w-4" /> Editar
                                                    </DropdownMenuItem>
                                                    {asset.status === 'available' && (
                                                        <DropdownMenuItem
                                                            onClick={() => confirmDelete(asset.id)}
                                                            className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="h-4 w-4" /> Deletar
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
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
                        <DialogTitle>Editar Equipamento</DialogTitle>
                    </DialogHeader>
                    {editingAsset && (
                        <form onSubmit={(e) => onSubmit(e, true)} className="space-y-4 pt-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="edit-type">Tipo *</Label>
                                    <Select name="type" required defaultValue={editingAsset.type}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="celular">Celular</SelectItem>
                                            <SelectItem value="tablet">Tablet</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="edit-condition">Condicao *</Label>
                                    <Select name="condition" required defaultValue={editingAsset.condition}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="novo">Novo</SelectItem>
                                            <SelectItem value="bom">Bom (Usado)</SelectItem>
                                            <SelectItem value="regular">Regular</SelectItem>
                                            <SelectItem value="ruim">Ruim / Defeito</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-status">Status Atual *</Label>
                                <Select name="status" required defaultValue={editingAsset.status}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="available">Disponivel</SelectItem>
                                        <SelectItem value="in_use">Em Uso</SelectItem>
                                        <SelectItem value="maintenance">Manutencao</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-model">Modelo / Nome *</Label>
                                <Input id="edit-model" name="model" defaultValue={editingAsset.model} required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-imei2">IMEI 2 *</Label>
                                <Input id="edit-imei2" name="imei2" defaultValue={editingAsset.imei2 || ""} required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-observations">Observacoes</Label>
                                <Textarea id="edit-observations" name="observations" defaultValue={editingAsset.observations || ""} />
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t">
                                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? "Salvando..." : "Salvar"}
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* DELETE MODAL */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="sm:max-w-[400px] text-center p-6 rounded-3xl">
                    <DialogHeader className="flex flex-col items-center justify-center space-y-4">
                        <div className="h-16 w-16 bg-red-500/10 text-red-600 rounded-full flex items-center justify-center mb-2 mx-auto">
                            <ShieldAlert className="h-8 w-8" />
                        </div>
                        <DialogTitle className="text-xl font-black">Remover Equipamento</DialogTitle>
                        <DialogDescription className="text-center font-medium">
                            Tem certeza que deseja remover este equipamento?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="flex gap-4 justify-center w-full pt-6 sm:justify-center">
                        <Button
                            variant="ghost"
                            className="rounded-xl flex-1 font-bold h-12"
                            onClick={() => setIsDeleteOpen(false)}
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
