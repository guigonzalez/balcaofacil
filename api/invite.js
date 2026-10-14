import { createClient } from "@supabase/supabase-js";

const allowedRoles = new Set(["admin", "attendant"]);
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(response, status, body) {
  response.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(body));
}

function allowedOrigin(request) {
  const origin = request.headers.origin;
  if (!origin) return false;
  const appUrl = process.env.APP_URL;
  if (appUrl) {
    try {
      if (new URL(appUrl).origin === origin) return true;
    } catch {
      return false;
    }
  }
  if (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` === origin) return true;
  return ["http://localhost:5173", "http://127.0.0.1:5173"].includes(origin);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "Método não permitido." });
  }
  if (!allowedOrigin(request)) return json(response, 403, { error: "Origem não permitida." });

  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return json(response, 401, { error: "Sessão necessária." });

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !process.env.APP_URL) {
    console.error("Invite API is missing Supabase server configuration.");
    return json(response, 503, { error: "O serviço de convites ainda não está configurado." });
  }

  let payload;
  try {
    payload = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
  } catch {
    return json(response, 400, { error: "Corpo JSON inválido." });
  }
  const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
  const storeId = typeof payload?.store_id === "string" ? payload.store_id : "";
  const role = typeof payload?.role === "string" ? payload.role : "";
  if (!emailPattern.test(email) || email.length > 254 || !/^[0-9a-f-]{36}$/i.test(storeId) || !allowedRoles.has(role)) {
    return json(response, 400, { error: "Informe um e-mail, loja e perfil válidos." });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } }
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json(response, 401, { error: "Sessão inválida ou expirada." });

    const { data: membership, error: membershipError } = await adminClient
      .from("store_members")
      .select("role")
      .eq("store_id", storeId)
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (membershipError) {
      console.error("Could not verify the inviter's store membership.", membershipError);
      return json(response, 500, { error: "Não foi possível validar sua permissão." });
    }
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return json(response, 403, { error: "Somente proprietários e administradores podem convidar pessoas." });
    }

    const redirectTo = new URL("/", process.env.APP_URL).toString();
    const { data: invitation, error: invitationError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo,
      data: { store_id: storeId, role }
    });
    if (invitationError || !invitation.user) {
      if (invitationError?.code === "email_exists" || invitationError?.message?.toLowerCase().includes("already")) {
        return json(response, 409, { error: "Este e-mail já tem uma conta ou convite. Verifique as pessoas da loja antes de tentar novamente." });
      }
      console.error("Supabase could not send the store invitation.", invitationError);
      return json(response, 502, { error: "Não foi possível enviar o convite. Confira o e-mail e a configuração de SMTP." });
    }

    const { error: insertError } = await adminClient.from("store_members").insert({
      store_id: storeId,
      user_id: invitation.user.id,
      role
    });
    if (insertError) {
      console.error("Invitation was sent, but store membership could not be created.", insertError);
      return json(response, 502, { error: "O convite foi enviado, mas o acesso à loja não pôde ser registrado. Procure o suporte antes de reenviar." });
    }

    return json(response, 202, { invited: true });
  } catch (error) {
    console.error("Unexpected error while processing a store invitation.", error);
    return json(response, 500, { error: "Ocorreu um erro inesperado ao processar o convite." });
  }
}
