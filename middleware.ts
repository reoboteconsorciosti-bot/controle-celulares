import { withAuth } from "next-auth/middleware"

export default withAuth({
    callbacks: {
        authorized: ({ req, token }) => {
            // Somente exige token nas rotas protegidas (Credenciais)
            const pathname = req.nextUrl.pathname
            if (pathname.startsWith("/credenciais") || pathname.startsWith("/api/credentials")) {
                return !!token
            }
            return true
        },
    },
    pages: {
        signIn: "/",
    },
})

// Especifica em quais rotas o middleware deve rodar
export const config = {
    matcher: ["/credenciais/:path*", "/api/credentials/:path*"],
}
