/// <reference lib="deno.ns" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        ok: false,
        message: "Method tidak diizinkan.",
      },
      405,
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse(
        {
          ok: false,
          message:
            "Konfigurasi Edge Function belum lengkap. Pastikan function sudah di-deploy di project Supabase yang benar.",
        },
        500,
      );
    }

    const authHeader = req.headers.get("Authorization") || "";

    if (!authHeader.startsWith("Bearer ")) {
      return jsonResponse(
        {
          ok: false,
          message: "Token login tidak ditemukan. Silakan login ulang.",
        },
        401,
      );
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        {
          ok: false,
          message: "Session tidak valid. Silakan login ulang.",
        },
        401,
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: adminProfile, error: adminProfileError } = await supabaseAdmin
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    if (adminProfileError) {
      throw adminProfileError;
    }

    if (!adminProfile || adminProfile.role !== "admin") {
      return jsonResponse(
        {
          ok: false,
          message:
            "Akses ditolak. Hanya admin yang bisa mengubah akun Posbankum.",
        },
        403,
      );
    }

    const body = await req.json().catch(() => ({}));

    const id_posbankum = String(body.id_posbankum || "").trim();
    const nama = String(body.nama || "").trim();
    const id_kabupaten = String(body.id_kabupaten || "").trim();
    const id_kecamatan = String(body.id_kecamatan || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const password =
      typeof body.password === "string" ? body.password.trim() : "";

    if (!id_posbankum) {
      return jsonResponse(
        {
          ok: false,
          message: "ID Posbankum wajib dikirim.",
        },
        400,
      );
    }

    if (!nama) {
      return jsonResponse(
        {
          ok: false,
          message: "Nama Posbankum wajib diisi.",
        },
        400,
      );
    }

    if (!id_kabupaten) {
      return jsonResponse(
        {
          ok: false,
          message: "Kabupaten wajib dipilih.",
        },
        400,
      );
    }

    if (!id_kecamatan) {
      return jsonResponse(
        {
          ok: false,
          message: "Kecamatan wajib dipilih.",
        },
        400,
      );
    }

    if (!email) {
      return jsonResponse(
        {
          ok: false,
          message: "Email wajib diisi.",
        },
        400,
      );
    }

    if (password && password.length < 6) {
      return jsonResponse(
        {
          ok: false,
          message: "Password baru minimal 6 karakter.",
        },
        400,
      );
    }

    const { data: posbankum, error: posbankumError } = await supabaseAdmin
      .from("posbankum")
      .select("id_posbankum, email_akun")
      .eq("id_posbankum", id_posbankum)
      .maybeSingle();

    if (posbankumError) {
      throw posbankumError;
    }

    if (!posbankum) {
      return jsonResponse(
        {
          ok: false,
          message: "Data Posbankum tidak ditemukan.",
        },
        404,
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, id_posbankum, role")
      .eq("id_posbankum", id_posbankum)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (!profile?.id) {
      return jsonResponse(
        {
          ok: false,
          message:
            "Akun login untuk Posbankum ini tidak ditemukan di tabel profiles.",
        },
        404,
      );
    }

    const authPayload: {
      email?: string;
      password?: string;
      email_confirm?: boolean;
      user_metadata?: Record<string, unknown>;
    } = {
      user_metadata: {
        full_name: nama,
        role: "posbankum",
        id_posbankum,
      },
    };

    const emailLama = String(posbankum.email_akun || "")
      .trim()
      .toLowerCase();

    if (email !== emailLama) {
      authPayload.email = email;
      authPayload.email_confirm = true;
    }

    if (password) {
      authPayload.password = password;
    }

    const { error: authUpdateError } =
      await supabaseAdmin.auth.admin.updateUserById(profile.id, authPayload);

    if (authUpdateError) {
      throw authUpdateError;
    }

    const updatePosbankumPayload: Record<string, unknown> = {
      nama,
      id_kabupaten,
      id_kecamatan,
      email_akun: email,
      updated_at: new Date().toISOString(),
    };

    if (password) {
      updatePosbankumPayload.password_akun = password;
    }

    const { error: updatePosbankumError } = await supabaseAdmin
      .from("posbankum")
      .update(updatePosbankumPayload)
      .eq("id_posbankum", id_posbankum);

    if (updatePosbankumError) {
      throw updatePosbankumError;
    }

    const { error: updateProfileError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: nama,
        id_posbankum,
      })
      .eq("id", profile.id);

    if (updateProfileError) {
      throw updateProfileError;
    }

    return jsonResponse(
      {
        ok: true,
        message: "Akun Posbankum berhasil diperbarui.",
      },
      200,
    );
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan pada server.",
      },
      500,
    );
  }
});
