"use client";
import {createBrowserClient} from "@supabase/ssr";import {getSupabaseConfig} from "./config";import type {Database} from "./database.types";
let client:ReturnType<typeof createBrowserClient<Database>>|null=null;
export function createSupabaseBrowserClient(){const config=getSupabaseConfig();if(!config)return null;client??=createBrowserClient<Database>(config.url,config.anonKey);return client}
