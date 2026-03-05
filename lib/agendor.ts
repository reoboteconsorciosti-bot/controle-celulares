export async function syncUserToAgendor(user: {
    name: string,
    email?: string | null,
    phone?: string | null,
    location?: string | null,
    role?: string
}) {
    const token = process.env.AGENDOR_API_TOKEN;
    if (!token) {
        console.warn("AGENDOR_API_TOKEN não configurado. Sincronização com Agendor ignorada.");
        return;
    }

    const payload = {
        name: user.name,
        email: user.email,
        workPhone: user.phone,
        description: `Cargo: ${user.role || 'Consultor'} - Localidade: ${user.location || 'Não informada'}`,
        category: "Colaborador"
    };

    try {
        const response = await fetch("https://api.agendor.com.br/v3/people/upsert", {
            method: "POST",
            headers: {
                "Authorization": `Token ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("Erro ao sincronizar colaborador com Agendor:", error);
        } else {
            console.log(`Colaborador ${user.name} sincronizado com Agendor com sucesso.`);
        }
    } catch (error) {
        console.error("Erro de conexão com Agendor API:", error);
    }
}
