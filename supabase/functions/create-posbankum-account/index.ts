import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = {
  nama: string;
  id_kabupaten: string;
  id_kecamatan: string;
  email: string;
  password: string;
};

function json(status: number, payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function pickAuthHeader(req: Request) {
  // Headers.get itu case-insensitive, tapi kita amankan saja
  return req.headers.get("authorization") ?? req.headers.get("Authorization") ?? "";
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { ok: false, message: "Method not allowed" });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRole = Deno.env.get("SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRole) {
      return json(500, {
        ok: false,
        message:
          "Missing env. Pastikan SUPABASE_URL, SUPABASE_ANON_KEY, dan SERVICE_ROLE_KEY tersedia.",
      });
    }

    // ===== 1) Ambil JWT admin dari Authorization header =====
    const authHeader = pickAuthHeader(req);
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!jwt) {
      return json(401, {
        ok: false,
        message: "Unauthorized: Missing Authorization Bearer token",
      });
    }

    // Client: user (untuk validasi pemanggil)
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        headers: { Authorization: `Bearer ${jwt}` },
      },
    });

    // Client: admin (service role)
    const adminClient = createClient(supabaseUrl, serviceRole, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // ===== 2) Pastikan token valid (ambil user dari JWT) =====
    const { data: userData, error: userErr } = await userClient.auth.getUser(jwt);
    if (userErr || !userData?.user) {
      return json(401, {
        ok: false,
        message: "Unauthorized: Invalid/Expired token",
        detail: userErr?.message,
      });
    }

    const callerId = userData.user.id;

    // ===== 3) Cek role admin di profiles =====
    const { data: prof, error: profErr } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("id", callerId)
      .single();

    if (profErr || !prof) {
      return json(403, { ok: false, message: "Forbidden (profile not found)" });
    }
    if (prof.role !== "admin") {
      return json(403, { ok: false, message: "Forbidden (admin only)" });
    }

    // ===== 4) Ambil body =====
    const body = (await req.json()) as Body;

    const nama = (body.nama ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const password = (body.password ?? "").trim();
    const id_kabupaten = body.id_kabupaten;
    const id_kecamatan = body.id_kecamatan;

    if (!nama) return json(400, { ok: false, message: "Nama Posbankum wajib diisi." });
    if (!id_kabupaten) return json(400, { ok: false, message: "Kabupaten wajib dipilih." });
    if (!id_kecamatan) return json(400, { ok: false, message: "Kecamatan wajib dipilih." });
    if (!email) return json(400, { ok: false, message: "Email wajib diisi." });
    if (!password) return json(400, { ok: false, message: "Password wajib diisi." });

    // ===== 5) Cek email sudah dipakai di posbankum? =====
    const { data: existsPos } = await adminClient
      .from("posbankum")
      .select("id_posbankum")
      .eq("email_akun", email)
      .maybeSingle();

    if (existsPos?.id_posbankum) {
      return json(409, {
        ok: false,
        message: "Email sudah digunakan untuk akun posbankum lain.",
      });
    }

    // ===== 6) Buat user auth (posbankum/paralegal) =====
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (createErr || !created?.user) {
      return json(400, { ok: false, message: createErr?.message || "Gagal membuat user auth." });
    }

    const newUserId = created.user.id;

    // ===== 7) Insert posbankum =====
    const { data: pos, error: posErr } = await adminClient
      .from("posbankum")
      .insert({
        nama,
        id_kabupaten,
        id_kecamatan,
        email_akun: email,
      })
      .select("id_posbankum")
      .single();

    if (posErr || !pos?.id_posbankum) {
      await adminClient.auth.admin.deleteUser(newUserId);
      return json(400, { ok: false, message: posErr?.message || "Gagal insert posbankum." });
    }

    const id_posbankum = pos.id_posbankum;

    // ===== 8) Upsert profiles user baru =====
    const { error: upErr } = await adminClient.from("profiles").upsert(
      { id: newUserId, role: "posbankum", id_posbankum },
      { onConflict: "id" },
    );

    if (upErr) {
      await adminClient.from("posbankum").delete().eq("id_posbankum", id_posbankum);
      await adminClient.auth.admin.deleteUser(newUserId);
      return json(400, { ok: false, message: upErr.message || "Gagal menautkan profiles." });
    }

    return json(200, {
      ok: true,
      message: "Akun posbankum berhasil dibuat.",
      data: { id_posbankum, user_id: newUserId, email },
    });
  } catch (e) {
    return json(500, { ok: false, message: e?.message || "Server error" });
  }
});
