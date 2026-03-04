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
  Server,
  LogOut,
  ChevronsUpDown,
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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"

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

  // Desestruturando informações vitais da Sessão NextAuth Google
  const userFallback = session?.user?.name?.charAt(0) || "G"
  const userName = (session as any)?.googleName || session?.user?.name || "Visitante"
  const userEmail = (session as any)?.googleEmail || session?.user?.email || "Nenhum email"
  const userImage = (session as any)?.googlePicture || session?.user?.image || ""

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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background ring-1 ring-border/50 shadow-sm overflow-hidden p-1">
            <Image
              src="/reobote-logo.png"
              alt="Reobote"
              width={32}
              height={32}
              className="object-contain w-full h-full scale-[1.35] md:scale-[1.40]"
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
      <SidebarContent className="px-2 mt-2">
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
                        ? "bg-primary/10 text-primary font-bold hover:bg-primary/15"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground font-medium"
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

      <SidebarFooter className="p-3 border-t border-border/40 mt-auto">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground rounded-xl transition-all hover:bg-muted/80 h-14"
                >
                  <Avatar className="h-9 w-9 rounded-lg shadow-sm border border-border/50">
                    <AvatarImage src={userImage} alt={userName} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-primary font-bold">{userFallback}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                    <span className="truncate font-bold text-foreground/90">{userName}</span>
                    <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4 opacity-50 group-data-[collapsible=icon]:hidden" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-xl shadow-lg border-border/40"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={userImage} alt={userName} />
                      <AvatarFallback className="rounded-lg">{userFallback}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{userName}</span>
                      <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border/50" />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/10 cursor-pointer rounded-lg font-medium opacity-90 transition-colors">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair da Conta Google
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
