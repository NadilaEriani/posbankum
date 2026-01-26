import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Body = {
  nama: string;
  id_kabupaten: string; // uuid/text sesuai skema kamu
  id_kecamatan: string; // uuid/text sesuai skema kamu
  email: string;
  password: string;
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, message: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY"); // default env dari Supabase Functions
    const serviceRole = Deno.env.get("SERVICE_ROLE_KEY"); // ✅ secret yang kamu set

    if (!supabaseUrl || !anonKey || !serviceRole) {
      return new Response(
        JSON.stringify({
          ok: false,
          message:
            "Missing env. Pastikan SUPABASE_URL, SUPABASE_ANON_KEY (default), dan SERVICE_ROLE_KEY (secret) tersedia.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Client untuk cek user pemanggil (pakai JWT dari request)
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Client admin (service role) untuk create user + bypass RLS
    const adminClient = createClient(supabaseUrl, serviceRole);

    // 1) pastikan yang memanggil adalah admin
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, message: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = userData.user.id;

    const { data: prof, error: profErr } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("id", callerId)
      .single();

    if (profErr || !prof || prof.role !== "admin") {
      return new Response(JSON.stringify({ ok: false, message: "Forbidden (admin only)" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) ambil body
    const body = (await req.json()) as Body;

    const nama = (body.nama ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const password = (body.password ?? "").trim();
    const id_kabupaten = body.id_kabupaten;
    const id_kecamatan = body.id_kecamatan;

    if (!nama) throw new Error("Nama Posbankum wajib diisi.");
    if (!id_kabupaten) throw new Error("Kabupaten wajib dipilih.");
    if (!id_kecamatan) throw new Error("Kecamatan wajib dipilih.");
    if (!email) throw new Error("Email wajib diisi.");
    if (!password) throw new Error("Password wajib diisi.");

    // 3) cek email sudah dipakai di posbankum?
    const { data: existsPos } = await adminClient
      .from("posbankum")
      .select("id_posbankum")
      .eq("email_akun", email)
      .maybeSingle();

    if (existsPos?.id_posbankum) {
      return new Response(
        JSON.stringify({ ok: false, message: "Email sudah digunakan untuk akun posbankum lain." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4) buat user auth (paralegal/posbankum)
    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // biar langsung bisa login tanpa verifikasi
    });

    if (createErr || !created?.user) {
      throw new Error(createErr?.message || "Gagal membuat user auth.");
    }

    const newUserId = created.user.id;

    // 5) insert posbankum
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
      // cleanup: kalau insert posbankum gagal, hapus user auth yang sudah terbuat
      await adminClient.auth.admin.deleteUser(newUserId);
      throw new Error(posErr?.message || "Gagal insert posbankum.");
    }

    const id_posbankum = pos.id_posbankum;

    // 6) upsert profiles untuk user baru (role posbankum + link ke posbankum)
    // Catatan: pastikan tabel profiles kamu punya kolom: id (uuid), role (user_role), id_posbankum (uuid)
    const { error: upErr } = await adminClient.from("profiles").upsert(
      {
        id: newUserId,
        role: "posbankum",
        id_posbankum,
      },
      { onConflict: "id" },
    );

    if (upErr) {
      // cleanup minimal
      await adminClient.from("posbankum").delete().eq("id_posbankum", id_posbankum);
      await adminClient.auth.admin.deleteUser(newUserId);
      throw new Error(upErr.message || "Gagal menautkan profiles.");
    }

    return new Response(
      JSON.stringify({
        ok: true,
        message: "Akun posbankum berhasil dibuat.",
        data: { id_posbankum, user_id: newUserId, email },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, message: e?.message || "Server error" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
