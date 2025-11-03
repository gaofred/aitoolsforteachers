import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();

    const { data: activePlans, error } = await supabase
      .from("membership_plans")
      .select("*")
      .eq("is_active", true)
      .order("points_cost", { ascending: true });

    return NextResponse.json({
      success: true,
      plans: activePlans || [],
      count: activePlans?.length || 0,
      error: error?.message
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "未知错误"
    }, { status: 500 });
  }
}
