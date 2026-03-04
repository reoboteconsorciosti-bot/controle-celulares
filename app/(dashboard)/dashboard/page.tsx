"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Users, Monitor, Smartphone, Package, ShieldCheck, AlertCircle, TrendingUp, Cpu, Tablet, UserCircle, Activity, BarChart3, ChevronDown, Clock } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[140px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Skeleton className="h-[450px] rounded-2xl" />
        <Skeleton className="h-[450px] rounded-2xl" />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false)
  const { data, isLoading: swrLoading } = useSWR("/api/dashboard", {
    refreshInterval: 300000,
  })

  useEffect(() => {
    setMounted(true)
  }, [])

  const isLoading = swrLoading || !mounted

  if (isLoading) return <DashboardSkeleton />
  if (!data) return <div className="p-8 text-center text-muted-foreground bg-muted/20 rounded-2xl border border-dashed">Erro ao carregar dados do painel de controle.</div>

  const overdues = data.allocations?.overdueLoans || []

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight text-foreground/90">
          Visao Geral
        </h2>
        <p className="text-[15px] text-muted-foreground max-w-2xl">
          Apanhado estrutural dos ativos e colaboradores da empresa.
        </p>
      </div>

      {/* STATS CARDS */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <div className="card-premium p-6 flex flex-col justify-between">
          <div className="flex flex-row items-center justify-between pb-4">
            <h3 className="text-[14px] font-bold text-foreground/90 tracking-wide uppercase">Colaboradores</h3>
            <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-4xl font-extrabold tracking-tight text-foreground/90">{data.users?.total || 0}</div>
            <p className="mt-1 mb-3 text-[11px] text-muted-foreground flex items-center gap-1 font-medium pb-2 border-b border-border/40">
              <span className="text-emerald-500 font-semibold flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {data.users?.active || 0}</span> ativos na base
            </p>
            <div className="space-y-1.5 max-h-[85px] overflow-y-auto pr-1">
              {data.users?.byRole?.length > 0 ? (
                data.users.byRole.map((roleObj: any) => (
                  <div key={roleObj.role || 'vazio'} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate max-w-[120px]" title={roleObj.role || "Sem Cargo"}>
                      {roleObj.role || "Sem Cargo"}
                    </span>
                    <span className="font-semibold text-foreground/80">{roleObj.count}</span>
                  </div>
                ))
              ) : (
                <div className="text-[11px] text-muted-foreground/50 italic py-2 text-center">Nenhum dado</div>
              )}
            </div>
          </div>
        </div>

        <div className="card-premium p-6 flex flex-col justify-between">
          <div className="flex flex-row items-center justify-between pb-4">
            <h3 className="text-[14px] font-bold text-foreground/90 tracking-wide uppercase">Equipamentos</h3>
            <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Monitor className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-4xl font-extrabold tracking-tight text-foreground/90">{data.assets?.total || 0}</div>
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5" /> Celulares</span>
                  <span className="font-bold text-foreground/90">{data.assets?.granular?.phone?.total || 0}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1 ml-5">
                  <span className="text-emerald-500 font-semibold">{data.assets?.granular?.phone?.active || 0} em uso</span>
                  <span className="opacity-50">•</span>
                  <span>{data.assets?.granular?.phone?.inactive || 0} em estoque</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border/40">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5"><Tablet className="h-3.5 w-3.5" /> Tablets</span>
                  <span className="font-bold text-foreground/90">{data.assets?.granular?.tablet?.total || 0}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1 ml-5">
                  <span className="text-emerald-500 font-semibold">{data.assets?.granular?.tablet?.active || 0} em uso</span>
                  <span className="opacity-50">•</span>
                  <span>{data.assets?.granular?.tablet?.inactive || 0} em estoque</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card-premium p-6 flex flex-col justify-between">
          <div className="flex flex-row items-center justify-between pb-4">
            <h3 className="text-[14px] font-bold text-indigo-900 dark:text-indigo-100 tracking-wide uppercase">Linhas e Chips</h3>
            <div className="h-10 w-10 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <Cpu className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-4xl font-extrabold tracking-tight text-foreground/90">{data.simCards?.total || 0}</div>
            <div className="mt-5 space-y-2.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><Package className="h-4 w-4 text-emerald-500" /> Livres / Estoque</span>
                <span className="font-bold text-foreground/90">{data.simCards?.available || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1.5"><Smartphone className="h-4 w-4 text-blue-500" /> Em Uso</span>
                <span className="font-medium text-foreground">{data.simCards?.active || 0}</span>
              </div>
              <div className="flex items-center justify-between text-sm border-t border-border/40 pt-2.5">
                <span className="text-muted-foreground flex items-center gap-1.5"><AlertCircle className="h-4 w-4 text-destructive/80" /> Banidos / Cancelados</span>
                <span className="font-semibold text-destructive/90">{data.simCards?.banned || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card-premium p-6 flex flex-col justify-between relative overflow-hidden group">
          <div className="flex flex-row items-center justify-between pb-4 relative z-10">
            <h3 className="text-[14px] font-bold text-indigo-900 dark:text-indigo-100 tracking-wide uppercase">Indice de Uso - Ativos</h3>
            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${((data.assets?.inUse || 0) / ((data.assets?.available || 0) + (data.assets?.inUse || 0) + (data.assets?.maintenance || 0)) * 100) >= 80
              ? 'bg-emerald-500/10 text-emerald-600'
              : ((data.assets?.inUse || 0) / ((data.assets?.available || 0) + (data.assets?.inUse || 0) + (data.assets?.maintenance || 0)) * 100) >= 50
                ? 'bg-amber-500/10 text-amber-600'
                : 'bg-red-500/10 text-red-600'
              }`}>
              <Activity className="h-5 w-5" />
            </div>
          </div>
          <div className="relative z-10">
            <div className="flex items-end gap-2 text-4xl font-extrabold tracking-tight text-foreground/90">
              {((((data.assets?.available || 0) + (data.assets?.inUse || 0) + (data.assets?.maintenance || 0)) === 0)
                ? 0
                : ((data.assets?.inUse || 0) / ((data.assets?.available || 0) + (data.assets?.inUse || 0) + (data.assets?.maintenance || 0)) * 100)).toFixed(0)}%
              <span className="text-sm font-semibold text-muted-foreground mb-1.5 align-baseline">em uso</span>
            </div>
            <div className="w-full bg-muted/50 rounded-full h-1.5 mb-3 mt-3 overflow-hidden">
              <div
                className={`h-1.5 rounded-full ${((data.assets?.inUse || 0) / ((data.assets?.available || 0) + (data.assets?.inUse || 0) + (data.assets?.maintenance || 0)) * 100) >= 80
                  ? 'bg-emerald-500'
                  : ((data.assets?.inUse || 0) / ((data.assets?.available || 0) + (data.assets?.inUse || 0) + (data.assets?.maintenance || 0)) * 100) >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                  }`}
                style={{ width: `${((((data.assets?.available || 0) + (data.assets?.inUse || 0) + (data.assets?.maintenance || 0)) === 0) ? 0 : ((data.assets?.inUse || 0) / ((data.assets?.available || 0) + (data.assets?.inUse || 0) + (data.assets?.maintenance || 0)) * 100))}%` }}
              ></div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-1 pt-3 border-t border-border/40 text-center">
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Total</p>
                <p className="text-sm font-bold text-foreground/80">{(data.assets?.available || 0) + (data.assets?.inUse || 0) + (data.assets?.maintenance || 0)}</p>
              </div>
              <div className="border-x border-border/40">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Locados</p>
                <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{data.assets?.inUse || 0}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-0.5">Ociosos</p>
                <p className="text-sm font-bold text-red-600 dark:text-red-400">{(data.assets?.available || 0) + (data.assets?.maintenance || 0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* LISTS SECTIONS */}
      <div className="grid gap-8 md:grid-cols-2 items-start">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="emprestimos" className="border-none">
            <div className="card-premium flex flex-col overflow-hidden">
              <AccordionTrigger className="w-full hover:no-underline p-6 pb-4 border-b border-border/40 bg-muted/10 data-[state=open]:bg-muted/20 transition-colors group">
                <div className="flex flex-col items-start w-full text-left gap-1">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-foreground/90">
                    <Package className="h-5 w-5 text-primary/80 group-data-[state=open]:text-primary transition-colors" />
                    Emprestimos
                  </h3>
                  <p className="text-sm text-muted-foreground font-normal">
                    Ativos que estao atualmente emprestados.
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-0 border-none">
                <div className="p-6 overflow-auto max-h-[400px]">
                  {overdues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-10 opacity-70">
                      <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-4">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <p className="text-lg font-medium text-foreground">Tudo em casa!</p>
                      <p className="text-sm text-muted-foreground">Nenhum emprestimo ativo no momento.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {overdues.map((loan: any) => (
                        <div key={loan.id} className="group flex flex-col gap-2 p-4 rounded-xl border border-primary/20 bg-primary/[0.03] hover:bg-primary/[0.06] transition-colors">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-bold text-foreground/90">{loan.user.name}</p>
                              <p className="text-[13px] text-muted-foreground/90 mt-0.5">
                                {loan.asset.model} <span className="opacity-60">({loan.asset.type})</span>
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                Emprestado
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center gap-2 text-xs font-medium text-primary/80 bg-primary/5 w-fit px-2 py-1 rounded-md">
                            <Clock className="h-3.5 w-3.5" />
                            Desde: {format(new Date(loan.updatedAt || loan.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </div>
          </AccordionItem>
        </Accordion>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="atribuicoes" className="border-none">
            <div className="card-premium flex flex-col overflow-hidden">
              <AccordionTrigger className="w-full hover:no-underline p-6 pb-4 border-b border-border/40 bg-muted/10 data-[state=open]:bg-muted/20 transition-colors group">
                <div className="flex flex-col items-start w-full text-left gap-1">
                  <h3 className="flex items-center gap-2 text-lg font-bold text-foreground/90">
                    <Package className="h-5 w-5 text-primary/80 group-data-[state=open]:text-primary transition-colors" />
                    Ultimas Atribuicoes
                  </h3>
                  <p className="text-sm text-muted-foreground font-normal">
                    Historico recente de entregas de equipamentos.
                  </p>
                </div>
              </AccordionTrigger>
              <AccordionContent className="p-0 border-none">
                <div className="p-6 overflow-auto max-h-[400px]">
                  {(!data.allocations?.recent || data.allocations.recent.length === 0) ? (
                    <div className="flex flex-col items-center justify-center text-center py-10 opacity-70">
                      <p className="text-sm text-muted-foreground">Nenhuma atribuicao recente.</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {data.allocations.recent.map((alloc: any) => (
                        <div
                          key={alloc.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-border/40 last:border-0 last:pb-0"
                        >
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20">
                              <Package className="h-5 w-5 text-primary/80" />
                            </div>
                            <div className="flex flex-col gap-1">
                              <p className="text-[15px] font-bold leading-none text-foreground/90">
                                {alloc.user?.name}
                              </p>
                              <p className="text-[13px] text-muted-foreground">
                                {alloc.asset?.model} {alloc.simCard ? <span className="text-primary/70 font-medium"> • Chip final {alloc.simCard.phoneNumber.slice(-4)}</span> : ""}
                              </p>
                            </div>
                          </div>
                          <div className="text-[13px] font-medium text-muted-foreground/70 bg-muted/40 px-3 py-1.5 rounded-full w-fit">
                            {alloc.deliveryDate}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </div>
          </AccordionItem>
        </Accordion>
      </div>

      {/* ALERTAS FINANCEIROS (ROI) */}
      {
        (data.assets?.available > 0 || data.simCards?.available > 0) && (
          <div className="flex flex-col gap-4">
            <h3 className="flex items-center gap-2 text-lg font-bold text-foreground/90 px-1 mt-4">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Alertas Financeiros e Ociosidade
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {data.simCards?.available > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-[1.5rem] p-5 flex items-start gap-4 shadow-sm relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <AlertCircle className="h-24 w-24 text-amber-600" />
                  </div>
                  <div className="h-10 w-10 flex-shrink-0 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-700 dark:text-amber-500 mb-1">
                      {data.simCards.available} Chips em Estoque
                    </h4>
                    <p className="text-sm text-amber-600/80 dark:text-amber-500/80 font-medium leading-snug">
                      A empresa possui registros de linhas disponíveis sem uso ativo. Considere reatribuí-las ou cancelar planos ociosos para reduzir a fatura mensal.
                    </p>
                  </div>
                </div>
              )}

              {data.assets?.available > 0 && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-[1.5rem] p-5 flex items-start gap-4 shadow-sm relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Monitor className="h-24 w-24 text-blue-600" />
                  </div>
                  <div className="h-10 w-10 flex-shrink-0 rounded-2xl bg-blue-500/20 text-blue-600 flex items-center justify-center">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-blue-700 dark:text-blue-500 mb-1">
                      {data.assets.available} Equipamentos Ociosos
                    </h4>
                    <p className="text-sm text-blue-600/80 dark:text-blue-500/80 font-medium leading-snug">
                      Existem ativos aguardando destinação. Manter o estoque girando otimiza o capital investido e evita depreciação tecnológica.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      }
    </div>
  )
}
