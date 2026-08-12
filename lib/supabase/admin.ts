import "server-only";import {createClient} from "@supabase/supabase-js";import {getSupabaseConfig} from "./config";import type {Database} from "./database.types";
/** Narrow server-only elevated client for booking RPCs. Never import from Client Components. */
export function createServiceRoleClient(){const config=getSupabaseConfig(),key=process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();if(!config||!key)return null;return createClient<Database>(config.url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}})}
