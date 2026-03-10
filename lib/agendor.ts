/**
 * Utilitário para integração com a API do Agendor CRM.
 * Focado na gestão de acesso dos Usuários da equipe.
 */

/**
 * Tenta desativar um Usuário (membro da equipe) no Agendor pelo e-mail.
 * Útil para quando um colaborador é desligado no painel de controle.
 * Documentação: https://api-docs.agendor.com.br/#update-user
 */
export async function deactivateAgendorUser(email: string) {
    const token = process.env.AGENDOR_API_TOKEN;
    if (!token || !email) return;

    try {
        // 1. Busca o ID do usuário pelo e-mail
        // A API de listar usuários permite filtrar ou retornar todos.
        const response = await fetch("https://api.agendor.com.br/v3/users", {
            headers: {
                "Authorization": `Token ${token}`,
                "Accept": "application/json"
            },
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) return;

        const usersList = await response.json();
        const targetUser = usersList.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());

        if (targetUser && targetUser.id) {
            // 2. Se encontrou, dispara o PUT para desativar
            const updateRes = await fetch(`https://api.agendor.com.br/v3/users/${targetUser.id}`, {
                method: "PUT",
                headers: {
                    "Authorization": `Token ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ active: false }),
                signal: AbortSignal.timeout(10000)
            });

            if (updateRes.ok) {
                console.log(`[Agendor] Acesso do usuário "${email}" desativado com sucesso.`);
            } else {
                console.warn(`[Agendor] Falha ao desativar acesso do usuário "${email}".`);
            }
        }
    } catch (error) {
        console.error("[Agendor] Erro ao processar desativação de usuário:", error);
    }
}
