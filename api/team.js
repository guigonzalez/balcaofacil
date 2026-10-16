import { createClient } from "@supabase/supabase-js";

const allowedRoles = new Set(["admin", "attendant"]);

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
  const vercelOrigins = [
    process.env.VERCEL_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_BRANCH_URL
  ].filter(Boolean).map(host => `https://${host}`);
  return vercelOrigins.includes(origin)
    || ["http://localhost:5173", "http://127.0.0.1:5173"].includes(origin);
}

function validUuid(value) {
  return typeof value === "string" && /^[0-9a-f-]{36}$/i.test(value);
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return json(response, 405, { error: "Método não permitido." });
  }
  if (!allowedOrigin(request)) return json(response, 403, { error: "Origem não permitida." });

  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return json(response, 401, { error: "Sessão necessária." });

  let payload;
  try {
    payload = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
  } catch {
    return json(response, 400, { error: "Corpo JSON inválido." });
  }
  const action = payload?.action;
  const storeId = payload?.store_id;
  const targetUserId = payload?.user_id;
  const role = payload?.role;
  if (!["list", "update-role", "remove", "resend-invite"].includes(action) || !validUuid(storeId)) {
    return json(response, 400, { error: "Solicitação de equipe inválida." });
  }
  if (action !== "list" && !validUuid(targetUserId)) {
    return json(response, 400, { error: "Selecione uma pessoa válida da equipe." });
  }
  if (action === "update-role" && !allowedRoles.has(role)) {
    return json(response, 400, { error: "Selecione um perfil válido." });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Team API is missing Supabase server configuration.");
    return json(response, 503, { error: "A gestão da equipe ainda não está configurada." });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } }
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  try {
    const { data: authData, error: authError } =
      await userClient.auth.getUser(authorization.slice("Bearer ".length));
    if (authError || !authData.user) return json(response, 401, { error: "Sessão inválida ou expirada." });

    const { data: membership, error: membershipError } = await adminClient
      .from("store_members")
      .select("role")
      .eq("store_id", storeId)
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (membershipError) {
      console.error("Could not verify the team manager's store membership.", membershipError);
      return json(response, 500, { error: "Não foi possível validar sua permissão." });
    }
    if (!membership || !["owner", "admin"].includes(membership.role)) {
      return json(response, 403, { error: "Somente proprietários e administradores podem gerir a equipe." });
    }

    if (action === "list") {
      const { data: members, error: membersError } = await adminClient
        .from("store_members")
        .select("user_id, role, joined_at")
        .eq("store_id", storeId)
        .order("joined_at");
      if (membersError) {
        console.error("Could not load store members.", membersError);
        return json(response, 500, { error: "Não foi possível carregar as pessoas da equipe." });
      }
      const team = await Promise.all(members.map(async member => {
        const { data, error } = await adminClient.auth.admin.getUserById(member.user_id);
        if (error || !data.user) {
          console.error("Could not load a store member's account.", error);
          throw new Error("Não foi possível carregar os dados de uma pessoa da equipe.");
        }
        const user = data.user;
        return {
          user_id: member.user_id,
          role: member.role,
          joined_at: member.joined_at,
          email: user.email ?? "",
          status: user.email_confirmed_at ? "active" : "pending",
          invited_at: user.invited_at ?? null
        };
      }));
      return json(response, 200, { members: team });
    }

    if (targetUserId === authData.user.id) {
      return json(response, 400, { error: "Não é possível alterar o próprio acesso por esta tela." });
    }
    const { data: target, error: targetError } = await adminClient
      .from("store_members")
      .select("role")
      .eq("store_id", storeId)
      .eq("user_id", targetUserId)
      .maybeSingle();
    if (targetError) {
      console.error("Could not verify the target store member.", targetError);
      return json(response, 500, { error: "Não foi possível validar a pessoa selecionada." });
    }
    if (!target) return json(response, 404, { error: "Essa pessoa não tem mais acesso a esta loja." });
    if (target.role === "owner") {
      return json(response, 403, { error: "O acesso do proprietário não pode ser alterado por esta tela." });
    }

    if (action === "update-role") {
      const { error } = await adminClient
        .from("store_members")
        .update({ role })
        .eq("store_id", storeId)
        .eq("user_id", targetUserId);
      if (error) {
        console.error("Could not update a store member's role.", error);
        return json(response, 500, { error: "Não foi possível atualizar o perfil." });
      }
      return json(response, 200, { updated: true });
    }

    if (action === "resend-invite") {
      const { data, error } = await adminClient.auth.admin.getUserById(targetUserId);
      if (error || !data.user) {
        console.error("Could not load the invited account for resending.", error);
        return json(response, 500, { error: "Não foi possível verificar o convite." });
      }
      if (data.user.email_confirmed_at || !data.user.email) {
        return json(response, 400, { error: "Este convite já foi aceito ou não tem um e-mail válido." });
      }
      const inviteRedirect = new URL("/", request.headers.origin);
      inviteRedirect.searchParams.set("flow", "invite");
      const { error: resendError } = await adminClient.auth.resend({
        type: "signup",
        email: data.user.email,
        options: { emailRedirectTo: inviteRedirect.toString() }
      });
      if (resendError) {
        console.error("Could not resend the store invitation.", resendError);
        return json(response, 502, { error: "Não foi possível reenviar o convite. O link original ainda pode ser usado." });
      }
      return json(response, 200, { resent: true });
    }

    const { error: deleteError } = await adminClient
      .from("store_members")
      .delete()
      .eq("store_id", storeId)
      .eq("user_id", targetUserId);
    if (deleteError) {
      console.error("Could not remove a store member.", deleteError);
      return json(response, 500, { error: "Não foi possível remover o acesso à loja." });
    }
    return json(response, 200, { removed: true });
  } catch (error) {
    console.error("Unexpected error while managing the store team.", error);
    return json(response, 500, { error: error.message || "Ocorreu um erro inesperado ao gerir a equipe." });
  }
}
