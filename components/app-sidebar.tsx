"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Users,
  Monitor,
  Smartphone,
  KeyRound,
  ArrowLeftRight,
  Server,
  Command,
  LogOut,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar"

const navItems = [
  {
    title: "Visao Geral",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Colaboradores",
    href: "/colaboradores",
    icon: Users,
  },
  {
    title: "Equipamentos",
    href: "/hardware",
    icon: Monitor,
  },
  {
    title: "Chips e Linhas",
    href: "/chips",
    icon: Smartphone,
  },
  {
    title: "Credenciais",
    href: "/credenciais",
    icon: KeyRound,
  },
  {
    title: "Auditoria",
    href: "/auditoria",
    icon: Server,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const handleLogout = async () => {
    if (session) {
      await signOut({ callbackUrl: "/" })
    } else {
      window.location.href = "/"
    }
  }

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background ring-1 ring-border shadow-sm overflow-hidden">
            <Image
              src="/reobote-logo.png"
              alt="Reobote"
              width={32}
              height={32}
              className="object-contain w-full h-full scale-[1.35] md:scale-150"
              priority
            />
          </div>
          <div className="flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
            <span className="text-[15px] uppercase font-extrabold tracking-tight text-foreground truncate">
              Celulares
            </span>
            <span className="text-[10px] uppercase font-black tracking-[0.2em] text-primary opacity-90 truncate -mt-0.5">
              e Tablets
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 mb-2 px-3">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href))

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.title}
                      className={`h-11 rounded-lg px-3 transition-all duration-200 ${isActive
                        ? "bg-primary/10 text-primary font-medium hover:bg-primary/15"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground font-medium"
                        }`}
                    >
                      <Link href={item.href} className="flex items-center gap-3">
                        <item.icon className={`h-[18px] w-[18px] ${isActive ? 'text-primary' : 'opacity-70'}`} />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-border/40">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Sair / Trocar Conta"
              onClick={handleLogout}
              className="text-muted-foreground hover:bg-muted hover:text-foreground font-medium h-11"
            >
              <LogOut className="h-[18px] w-[18px] opacity-70" />
              <span>Sair / Voltar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
