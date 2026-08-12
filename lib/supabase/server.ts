import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";
import type { Database } from "./database.types";

/** Cookie-aware server client. It carries the caller's JWT and always remains subject to RLS. */
export async function createSupabaseServerClient(){
  const config=getSupabaseConfig(); if(!config)return null;
  const cookieStore=await cookies();
  return createServerClient<Database>(config.url,config.anonKey,{cookies:{getAll(){return cookieStore.getAll()},setAll(items){try{items.forEach(({name,value,options})=>cookieStore.set(name,value,options))}catch{/* Server Components cannot write cookies; proxy refresh handles this. */}}}})
}
