import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    define: {
      __APP_PRODUCTION__: JSON.stringify(mode === "production"),
      __SUPABASE_URL__: JSON.stringify(
        env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || ""
      ),
      __SUPABASE_ANON_KEY__: JSON.stringify(
        env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || ""
      )
    }
  };
});
