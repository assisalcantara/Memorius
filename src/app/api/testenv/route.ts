/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase/client";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { data: profiles, error: errProfiles } = await (supabase.from("profiles") as any).select("*, roles(nome)");
  const { data: roles, error: errRoles } = await (supabase.from("roles") as any).select("*");
  
  return NextResponse.json({
    supabaseUrl: (supabase as any).supabaseUrl,
    profiles,
    roles,
    errors: { errProfiles, errRoles }
  });
}
