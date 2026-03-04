import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const authOptions: NextAuthOptions = {
    providers: [
        // Google Provider — para identificação e auditoria
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
    ],
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60,
    },
    callbacks: {
        async jwt({ token, account, profile }) {
            // Quando o usuário faz login com Google, anotamos os dados dele no token
            if (account?.provider === "google" && profile) {
                token.googleEmail = profile.email
                token.googleName = profile.name
                token.googlePicture = (profile as any).picture

                // Tenta vincular ao colaborador cadastrado pelo e-mail
                try {
                    const colaborador = await db.query.users.findFirst({
                        where: eq(users.email, profile.email as string),
                    })
                    if (colaborador) {
                        token.colaboradorId = colaborador.id
                        token.colaboradorName = colaborador.name
                        token.colaboradorRole = colaborador.role
                    }
                } catch (e) {
                    // Silencioso — não quebra o login se o db estiver indisponível
                }
            }
            return token
        },
        async session({ session, token }) {
            // Passa as informações para a sessão acessível no frontend
            if (token.googleEmail) {
                (session as any).googleEmail = token.googleEmail;
                (session as any).googleName = token.googleName;
                (session as any).googlePicture = token.googlePicture;
                (session as any).colaboradorId = token.colaboradorId;
                (session as any).colaboradorName = token.colaboradorName;
                (session as any).colaboradorRole = token.colaboradorRole;
                (session as any).isGoogleLinked = true;
            }
            return session
        },
    },
    pages: {
        signIn: "/",
        error: "/",
    },
    secret: process.env.NEXTAUTH_SECRET || "default_development_secret_only",
}
