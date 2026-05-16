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

function normalizeEmail(value: unknown) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

async function findAuthUserByEmail(supabaseAdmin: any, email: string) {
  const targetEmail = normalizeEmail(email);
  if (!targetEmail) return null;

  let page = 1;
  const perPage = 1000;

  while (page <= 20) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw error;

    const users = data?.users || [];
    const found = users.find(
      (item: any) => normalizeEmail(item?.email) === targetEmail,
    );

    if (found) return found;

    if (users.length < perPage) break;
    page += 1;
  }

  return null;
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
    const email = normalizeEmail(body.email);
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

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse(
        {
          ok: false,
          message: "Format email tidak valid.",
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

    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("id, id_posbankum, role")
      .eq("id_posbankum", id_posbankum)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    const oldEmail = normalizeEmail(posbankum.email_akun);
    let authUserId = existingProfile?.id || "";

    if (!authUserId) {
      const authUserByNewEmail = await findAuthUserByEmail(
        supabaseAdmin,
        email,
      );
      const authUserByOldEmail =
        oldEmail && oldEmail !== email
          ? await findAuthUserByEmail(supabaseAdmin, oldEmail)
          : null;

      const matchedAuthUser = authUserByNewEmail || authUserByOldEmail;

      if (matchedAuthUser?.id) {
        authUserId = matchedAuthUser.id;
      }
    }

    if (!authUserId) {
      if (!password) {
        return jsonResponse(
          {
            ok: false,
            message:
              "Akun login Posbankum tidak ditemukan. Isi Password Baru untuk membuat ulang akun login.",
          },
          404,
        );
      }

      const { data: createdUser, error: createUserError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: nama,
            role: "posbankum",
            id_posbankum,
          },
        });

      if (createUserError) {
        throw createUserError;
      }

      authUserId = createdUser?.user?.id || "";

      if (!authUserId) {
        return jsonResponse(
          {
            ok: false,
            message: "Gagal membuat ulang akun login Posbankum.",
          },
          500,
        );
      }
    } else {
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

      if (email) {
        authPayload.email = email;
        authPayload.email_confirm = true;
      }

      if (password) {
        authPayload.password = password;
      }

      const { error: authUpdateError } =
        await supabaseAdmin.auth.admin.updateUserById(authUserId, authPayload);

      if (authUpdateError) {
        throw authUpdateError;
      }
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

    const { error: upsertProfileError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: authUserId,
          full_name: nama,
          role: "posbankum",
          id_posbankum,
        },
        {
          onConflict: "id",
        },
      );

    if (upsertProfileError) {
      throw upsertProfileError;
    }

    const { error: clearDuplicateProfileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id_posbankum", id_posbankum)
      .neq("id", authUserId);

    if (clearDuplicateProfileError) {
      console.warn("clear duplicate profile:", clearDuplicateProfileError);
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
