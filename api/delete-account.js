import { createClient } from "@supabase/supabase-js";

const IMAGE_BUCKET = "product-images";
const IMAGE_PAGE_SIZE = 100;

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

async function removeStoreImages(adminClient, storeId) {
  const bucket = adminClient.storage.from(IMAGE_BUCKET);
  for (;;) {
    const { data, error } = await bucket.list(storeId, { limit: IMAGE_PAGE_SIZE, offset: 0 });
    if (error) throw new Error(`Não foi possível listar as fotos da loja: ${error.message}`);
    const files = (data ?? []).filter(file => file.id && file.name);
    if (!files.length) return;
    const { error: removeError } = await bucket.remove(files.map(file => `${storeId}/${file.name}`));
    if (removeError) throw new Error(`Não foi possível apagar as fotos da loja: ${removeError.message}`);
  }
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
  const confirmation = payload?.confirmation;
  if (!["delete-store", "delete-account"].includes(action) || typeof confirmation !== "string") {
    return json(response, 400, { error: "Solicitação inválida." });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error("Account deletion API is missing Supabase server configuration.");
    return json(response, 503, { error: "O serviço de exclusão ainda não está configurado." });
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

    if (action === "delete-account") {
      const email = authData.user.email ?? "";
      if (!email || confirmation.trim().toLocaleLowerCase("en-US") !== email.toLocaleLowerCase("en-US")) {
        return json(response, 400, { error: "A confirmação não corresponde ao e-mail da conta." });
      }

      const { data: deletedStoreId, error: preparationError } = await adminClient.rpc(
        "prepare_user_account_deletion",
        { target_user_id: authData.user.id }
      );
      if (preparationError) {
        console.error("Could not prepare the account and store for deletion.", preparationError);
        return json(response, 500, { error: "Não foi possível preparar a transferência de propriedade. Nenhuma conta foi excluída." });
      }

      let warning = "";
      if (deletedStoreId) {
        try {
          await removeStoreImages(adminClient, deletedStoreId);
        } catch (error) {
          console.error("Store data was deleted, but its product images could not be fully removed.", error);
          warning = " A loja e os dados foram apagados, mas algumas fotos podem permanecer no armazenamento.";
        }
      }

      const { error: deletionError } = await adminClient.auth.admin.deleteUser(authData.user.id);
      if (deletionError) {
        console.error("The account could not be deleted after store ownership was prepared.", deletionError);
        return json(response, 502, { error: "A transferência de propriedade foi preparada, mas a conta não foi apagada. Tente novamente ou procure o suporte." });
      }

      return json(response, 200, {
        deleted: "account",
        storeDeleted: Boolean(deletedStoreId),
        warning: warning.trim()
      });
    }

    const { data: membership, error: membershipError } = await adminClient
      .from("store_members")
      .select("store_id, role")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (membershipError) {
      console.error("Could not verify the store owner before deletion.", membershipError);
      return json(response, 500, { error: "Não foi possível validar a propriedade da loja." });
    }
    if (!membership || membership.role !== "owner") {
      return json(response, 403, { error: "Somente o proprietário pode apagar a loja." });
    }

    const { data: store, error: storeError } = await adminClient
      .from("stores")
      .select("id, name")
      .eq("id", membership.store_id)
      .single();
    if (storeError) {
      console.error("Could not load the store before deletion.", storeError);
      return json(response, 500, { error: "Não foi possível localizar os dados da loja." });
    }
    if (confirmation.trim() !== store.name) {
      return json(response, 400, { error: "Digite o nome exato da loja para confirmar." });
    }

    try {
      await removeStoreImages(adminClient, store.id);
    } catch (error) {
      console.error("Could not remove store images before deleting its data.", error);
      return json(response, 502, { error: error.message });
    }

    const { error: deletionError } = await adminClient.from("stores").delete().eq("id", store.id);
    if (deletionError) {
      console.error("Could not delete the store data.", deletionError);
      return json(response, 500, { error: "As fotos foram removidas, mas os dados da loja não foram apagados. Tente novamente." });
    }

    return json(response, 200, { deleted: "store" });
  } catch (error) {
    console.error("Unexpected error while processing a deletion request.", error);
    return json(response, 500, { error: "Ocorreu um erro inesperado ao processar a exclusão." });
  }
}
