"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { toast } from "sonner"
import {
  Plus, Eye, EyeOff, Lock, ExternalLink, Copy, KeyRound,
  LayoutList, Table, Search, Pencil, Trash2,
  ShieldCheck, ShieldAlert, Check, ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { signOut } from "next-auth/react"

type Credential = {
  id: number
  userId: number
  system: string
  url: string | null
  username: string
  password?: string
  createdAt: string
  user?: { name: string; location?: string }
}

const emptyForm = {
  userId: "",
  system: "",
  url: "",
  username: "",
  password: "",
}

export default function CredenciaisPage() {
  const { data: credentials, isLoading: credsLoading, mutate, error: credentialsError } = useSWR<Credential[]>("/api/credentials")
  const { data: users, isLoading: usersLoading } = useSWR<{ id: number; name: string; location?: string }[]>("/api/users")

  const [mounted, setMounted] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [revealedPasswords, setRevealedPasswords] = useState<Record<number, string>>({})
  const [viewMode, setViewMode] = useState<"list" | "sheets">("list")
  const [showAllPasswords, setShowAllPasswords] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Master Password States
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [masterPassInput, setMasterPassInput] = useState("")
  const [verifyingMaster, setVerifyingMaster] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Delete Confirmation State
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [credentialToDelete, setCredentialToDelete] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
    if (sessionStorage.getItem('credential_master_unlocked') === 'true') {
      setIsUnlocked(true)
      setShowAllPasswords(true)
    }
  }, [])

  const isLoading = credsLoading || usersLoading || !mounted

  if (credentialsError) {
    console.error("Credentials error:", credentialsError)
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Lock className="h-12 w-12 text-destructive opacity-50" />
        <h3 className="text-xl font-bold">Erro de Acesso</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Nao foi possivel carregar as credenciais. Certifique-se de que voce esta devidamente autenticado.
        </p>
        <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
      </div>
    )
  }

  const filteredCredentials = credentials?.filter(cred => {
    const searchLower = searchTerm.toLowerCase()
    return cred.system.toLowerCase().includes(searchLower) ||
      cred.username.toLowerCase().includes(searchLower) ||
      cred.user?.name.toLowerCase().includes(searchLower)
  }) || []

  function openNew() {
    setForm(emptyForm)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.userId || !form.system || !form.username || !form.password) {
      toast.error("Colaborador, sistema, usuario e senha sao obrigatorios")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          userId: Number(form.userId),
        }),
      })

      if (!res.ok) throw new Error()

      toast.success("Credencial salva com sucesso no cofre!")
      setDialogOpen(false)
      mutate()
    } catch {
      toast.error("Erro ao salvar credencial. Tente novamente.")
    } finally {
      setSaving(false)
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

  const confirmDelete = (id: number) => {
    setCredentialToDelete(id)
    setIsDeleteConfirmOpen(true)
  }

  const executeDelete = async () => {
    if (!credentialToDelete) return
    setSaving(true)
    try {
      const res = await fetch(`/api/credentials?id=${credentialToDelete}`, { method: "DELETE" })
      if (!res.ok) throw new Error()
      toast.success("Credencial excluida")
      mutate()
      setIsDeleteConfirmOpen(false)
      setCredentialToDelete(null)
    } catch {
      toast.error("Erro ao excluir")
    } finally {
      setSaving(false)
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
        setIsUnlocked(true)
        setShowAllPasswords(true)
        sessionStorage.setItem('credential_master_unlocked', 'true')
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
    setShowAllPasswords(!showAllPasswords)
  }

  if (!mounted) return null

  if (!isUnlocked) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-6">
        <div className="max-w-md w-full bg-white dark:bg-zinc-950 border-2 border-primary/10 shadow-2xl rounded-[2.5rem] p-8 md:p-10 flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">
          <div className="h-24 w-24 rounded-[2rem] bg-primary/10 flex items-center justify-center mb-8 border border-primary/20 shadow-inner">
            <Lock className="h-12 w-12 text-primary drop-shadow-sm" />
          </div>
          <h2 className="text-3xl font-black text-center tracking-tight mb-3">Acesso Restrito</h2>
          <p className="text-center text-muted-foreground font-medium mb-10 text-[15px] leading-relaxed">
            Insira a Chave Mestra para acessar o <strong className="text-foreground">Cofre de Senhas</strong> da Reobote.
          </p>

          <div className="w-full space-y-6">
            <div className="space-y-3">
              <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-primary ml-2">Chave Mestra</Label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40 group-focus-within:text-primary transition-colors duration-300" />
                <Input
                  type="password"
                  value={masterPassInput}
                  onChange={(e) => setMasterPassInput(e.target.value)}
                  placeholder="••••••••••••"
                  className="h-16 pl-14 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border-2 border-transparent focus-visible:border-primary/40 focus-visible:ring-0 transition-all text-xl font-mono tracking-[0.3em] text-center shadow-sm placeholder:tracking-[0.3em] placeholder:text-muted-foreground/30"
                  onKeyDown={(e) => e.key === "Enter" && handleVerifyMaster()}
                  autoFocus
                />
              </div>
            </div>

            <Button
              onClick={handleVerifyMaster}
              disabled={verifyingMaster || !masterPassInput}
              className="w-full h-14 font-black uppercase text-xs tracking-[0.15em] shadow-xl shadow-primary/25 rounded-2xl group mt-2 transition-all hover:-translate-y-0.5"
            >
              {verifyingMaster ? "Validando Cofre..." : (
                <>
                  Desbloquear Acesso <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1.5 transition-transform" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* CABECALHO PREMIUM */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white/50 dark:bg-zinc-900/50 p-8 rounded-3xl border border-border/40 shadow-sm backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lock className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-4xl font-black tracking-tight text-foreground/90">
              Cofre de Credenciais
            </h2>
          </div>
          <p className="text-[15px] text-muted-foreground font-medium pl-1">
            Gestão de acessos Reobote. Use a página de Colaboradores para a visão Sheets unificada.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button
            variant="outline"
            className="h-12 px-6 rounded-2xl font-bold bg-white dark:bg-zinc-950 border-border/60 hover:bg-muted/50 transition-colors"
            onClick={() => {
              sessionStorage.removeItem('credential_master_unlocked')
              setIsUnlocked(false)
              setShowAllPasswords(false)
              toast.info("Cofre trancado com segurança.")
            }}
          >
            Trancar
          </Button>
          <Button onClick={openNew} className="gap-2 shadow-lg shadow-primary/20 rounded-2xl h-12 px-6 font-bold" size="lg">
            <Plus className="h-5 w-5" /> Nova Senha
          </Button>
        </div>
      </div>

      <div className="card-premium flex flex-col overflow-hidden bg-white/40 dark:bg-zinc-900/40 border border-border/40 shadow-2xl rounded-[2rem]">
        <div className="flex flex-col md:flex-row items-center justify-between p-6 gap-6 border-b border-border/40 bg-white/20 dark:bg-zinc-800/20 backdrop-blur-md">
          <div className="relative w-full max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground/40" />
            <Input
              type="search"
              placeholder="Pesquisar sistema, usuario ou consultor..."
              className="w-full bg-white dark:bg-zinc-950 shadow-inner border-border/40 hover:border-primary/40 appearance-none pl-12 h-14 rounded-2xl transition-all text-base"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/50 border border-border/30">
            <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></div>
            <span className="text-xs font-black uppercase tracking-widest text-foreground/70">
              {filteredCredentials.length} Acessos
            </span>
          </div>
        </div>

        <div className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[11px] text-muted-foreground/60 uppercase tracking-[0.15em] bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-border/20">
              <tr>
                <th className="px-8 py-5 font-black">Colaborador Owner</th>
                <th className="px-8 py-5 font-black">Sistema / Plataforma</th>
                <th className="px-8 py-5 font-black">Nome de Usuario</th>
                <th className="px-8 py-5 font-black">Senha de Acesso</th>
                <th className="px-8 py-5 font-black text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-8 py-5"><Skeleton className="h-6 w-[150px]" /></td>
                    <td className="px-8 py-5"><Skeleton className="h-6 w-[120px]" /></td>
                    <td className="px-8 py-5"><Skeleton className="h-6 w-[180px]" /></td>
                    <td className="px-8 py-5"><Skeleton className="h-8 w-[100px] rounded-md" /></td>
                    <td className="px-8 py-5 text-right"><Skeleton className="h-8 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredCredentials.length > 0 ? (
                filteredCredentials.map((cred) => (
                  <tr key={cred.id} className="hover:bg-muted/10 transition-colors group">
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 flex flex-shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <KeyRound className="h-5 w-5" />
                        </div>
                        <span className="font-bold text-foreground/90 text-[14px]">{cred.user?.name || "Desconhecido"}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-bold text-foreground/80">{cred.system}</span>
                        {cred.url && (
                          <a
                            href={cred.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline flex items-center gap-1 text-[11px] font-medium"
                          >
                            Link Externo <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap">
                      <div
                        className="flex items-center gap-2 group/u cursor-pointer hover:bg-muted/30 px-3 py-1.5 rounded-lg border border-transparent hover:border-border/40 transition-all"
                        onClick={() => copyToClipboard(cred.username, `user-${cred.id}`)}
                      >
                        <span className="font-mono text-[13px] text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                          {cred.username}
                        </span>
                        <div className="flex-shrink-0">
                          {copiedId === `user-${cred.id}` ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 opacity-0 group-hover/u:opacity-40 transition-opacity" />
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5 whitespace-nowrap bg-muted/5 border-l border-border/20">
                      <div className="flex items-center gap-2">
                        {showAllPasswords ? (
                          <>
                            <div
                              className="flex items-center gap-2 cursor-pointer bg-primary/10 text-primary px-3 py-1.5 rounded-lg border border-primary/20 hover:bg-primary/20 transition-all group/p"
                              onClick={() => copyToClipboard(cred.password || "***********", `pass-${cred.id}`)}
                            >
                              <code className="font-mono text-[13px] font-bold">
                                {cred.password || "***********"}
                              </code>
                              {copiedId === `pass-${cred.id}` ? (
                                <Check className="h-3.5 w-3.5 text-green-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5 opacity-40 group-hover/p:opacity-100 transition-opacity" />
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground"
                              onClick={(e) => { e.stopPropagation(); setShowAllPasswords(false); }}
                            >
                              <EyeOff className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <span className="text-muted-foreground tracking-widest text-lg opacity-40">••••••••</span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); setShowAllPasswords(true); }}
                            >
                              <Eye className="h-3.5 w-3.5" /> Exibir
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-destructive hover:bg-destructive/10 rounded-xl"
                          onClick={() => confirmDelete(cred.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center text-muted-foreground italic">
                    Nenhum registro encontrado no cofre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW CREDENTIAL DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Guardar no Cofre</DialogTitle>
            <DialogDescription>
              Adicione os detalhes de acesso ao sistema de forma segura.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="userId" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Colaborador Owner *</Label>
              <Select
                value={form.userId}
                onValueChange={(v) => setForm({ ...form, userId: v })}
              >
                <SelectTrigger id="userId" className="h-12 rounded-xl">
                  <SelectValue placeholder="Vinculado a quem?" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="system" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Sistema / Plataforma *</Label>
                <Input
                  id="system"
                  value={form.system}
                  onChange={(e) => setForm({ ...form, system: e.target.value })}
                  placeholder="Ex: ERP, Office 365, Conta Google..."
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="url" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">URL do Sistema (Opcional)</Label>
                <Input
                  id="url"
                  value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })}
                  placeholder="https://app.sistema.com"
                  className="h-12 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="username" className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Usuario / Email *</Label>
                <Input
                  id="username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="admin / user@..."
                  className="h-12 rounded-xl"
                />
              </div>
              <div className="flex flex-col gap-2 bg-primary/5 p-2 rounded-2xl border border-primary/20 -m-1 mt-0 ml-0 relative">
                <Label htmlFor="password" className="text-xs font-bold uppercase tracking-widest text-primary ml-1">Senha Secreta *</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="h-10 rounded-lg bg-background shadow-sm mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="pt-2 bg-muted/20 -mx-6 -mb-6 p-6 rounded-b-3xl mt-4">
            <Button
              variant="ghost"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="rounded-xl h-12 font-bold"
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving} className="rounded-xl h-12 px-8 font-bold shadow-lg shadow-primary/20">
              {saving ? "Salvando..." : "Salvar no Cofre"}
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
            <DialogTitle className="text-xl font-black">Remover Credencial</DialogTitle>
            <DialogDescription className="text-center font-medium">
              Tem certeza que deseja excluir esta credencial de acesso?
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
              disabled={saving}
            >
              {saving ? "Removendo..." : "Confirmar Exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MASTER PASSWORD MODAL REMOVED - REPLACED BY PAGE LOCK */}
    </div>
  )
}
export const dynamic = 'force-dynamic'
