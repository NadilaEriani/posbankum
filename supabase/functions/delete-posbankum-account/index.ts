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

function uniqueList(values: unknown[]) {
  return Array.from(
    new Set(values.map((value) => String(value || "").trim()).filter(Boolean)),
  );
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

async function deleteEq(
  supabaseAdmin: any,
  table: string,
  column: string,
  value: string,
) {
  if (!value) return;

  const { error } = await supabaseAdmin.from(table).delete().eq(column, value);

  if (error) {
    throw new Error(`Gagal menghapus data ${table}: ${error.message}`);
  }
}

async function deleteIn(
  supabaseAdmin: any,
  table: string,
  column: string,
  values: string[],
) {
  const safeValues = uniqueList(values);
  if (!safeValues.length) return;

  const { error } = await supabaseAdmin
    .from(table)
    .delete()
    .in(column, safeValues);

  if (error) {
    throw new Error(`Gagal menghapus data ${table}: ${error.message}`);
  }
}

async function updateIn(
  supabaseAdmin: any,
  table: string,
  payload: Record<string, unknown>,
  column: string,
  values: string[],
) {
  const safeValues = uniqueList(values);
  if (!safeValues.length) return;

  const { error } = await supabaseAdmin
    .from(table)
    .update(payload)
    .in(column, safeValues);

  if (error) {
    throw new Error(`Gagal memperbarui data ${table}: ${error.message}`);
  }
}

async function selectEq(
  supabaseAdmin: any,
  table: string,
  columns: string,
  column: string,
  value: string,
) {
  if (!value) return [];

  const { data, error } = await supabaseAdmin
    .from(table)
    .select(columns)
    .eq(column, value);

  if (error) {
    throw new Error(`Gagal membaca data ${table}: ${error.message}`);
  }

  return data || [];
}

async function selectIn(
  supabaseAdmin: any,
  table: string,
  columns: string,
  column: string,
  values: string[],
) {
  const safeValues = uniqueList(values);
  if (!safeValues.length) return [];

  const { data, error } = await supabaseAdmin
    .from(table)
    .select(columns)
    .in(column, safeValues);

  if (error) {
    throw new Error(`Gagal membaca data ${table}: ${error.message}`);
  }

  return data || [];
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
            "Konfigurasi Edge Function belum lengkap. Pastikan SUPABASE_URL, SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY tersedia.",
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

    if (adminProfileError) throw adminProfileError;

    if (!adminProfile || adminProfile.role !== "admin") {
      return jsonResponse(
        {
          ok: false,
          message:
            "Akses ditolak. Hanya admin yang bisa menghapus akun Posbankum.",
        },
        403,
      );
    }

    const body = await req.json().catch(() => ({}));

    const id_posbankum = String(body.id_posbankum || "").trim();
    const email = normalizeEmail(body.email);

    if (!id_posbankum && !email) {
      return jsonResponse(
        {
          ok: false,
          message: "ID Posbankum atau email wajib dikirim.",
        },
        400,
      );
    }

    let posbankum: any = null;

    if (id_posbankum) {
      const { data, error } = await supabaseAdmin
        .from("posbankum")
        .select("id_posbankum,nama,email_akun")
        .eq("id_posbankum", id_posbankum)
        .maybeSingle();

      if (error) throw error;
      posbankum = data || null;
    }

    const emailTarget = normalizeEmail(email || posbankum?.email_akun);

    const profileRows = id_posbankum
      ? await selectEq(
          supabaseAdmin,
          "profiles",
          "id,id_posbankum,role",
          "id_posbankum",
          id_posbankum,
        )
      : [];

    const profileIds = uniqueList(profileRows.map((item: any) => item.id));
    const authIds = [...profileIds];

    if (emailTarget) {
      const authUserByEmail = await findAuthUserByEmail(
        supabaseAdmin,
        emailTarget,
      );

      if (authUserByEmail?.id) {
        authIds.push(authUserByEmail.id);
      }
    }

    const finalAuthIds = uniqueList(authIds);

    if (!posbankum && id_posbankum) {
      if (!finalAuthIds.length) {
        return jsonResponse(
          {
            ok: false,
            message:
              "Data Posbankum sudah tidak ada dan akun Auth tidak ditemukan.",
          },
          404,
        );
      }

      await deleteIn(supabaseAdmin, "profiles", "id", finalAuthIds);

      for (const authUserId of finalAuthIds) {
        const { error: deleteAuthError } =
          await supabaseAdmin.auth.admin.deleteUser(authUserId);

        if (deleteAuthError) {
          throw new Error(
            `Akun Auth gagal dihapus: ${deleteAuthError.message}`,
          );
        }
      }

      return jsonResponse(
        {
          ok: true,
          message:
            "Data Posbankum sudah tidak ada, akun Auth yang tersisa berhasil dihapus.",
        },
        200,
      );
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

    const pengaduanByPos = await selectEq(
      supabaseAdmin,
      "pengaduan",
      "id_pengaduan",
      "id_posbankum",
      id_posbankum,
    );

    const pengaduanByCreator = await selectIn(
      supabaseAdmin,
      "pengaduan",
      "id_pengaduan",
      "created_by",
      profileIds,
    );

    const paralegalRows = await selectEq(
      supabaseAdmin,
      "paralegal_members",
      "id_paralegal",
      "id_posbankum",
      id_posbankum,
    );

    const paralegalIds = uniqueList(
      paralegalRows.map((item: any) => item.id_paralegal),
    );

    const pengaduanByParalegal = await selectIn(
      supabaseAdmin,
      "pengaduan",
      "id_pengaduan",
      "id_paralegal",
      paralegalIds,
    );

    const pengaduanIds = uniqueList([
      ...pengaduanByPos.map((item: any) => item.id_pengaduan),
      ...pengaduanByCreator.map((item: any) => item.id_pengaduan),
      ...pengaduanByParalegal.map((item: any) => item.id_pengaduan),
    ]);

    const kasusByPos = await selectEq(
      supabaseAdmin,
      "kasus",
      "id_kasus,global_case_id",
      "id_posbankum",
      id_posbankum,
    );

    const kasusByPengaduan = await selectIn(
      supabaseAdmin,
      "kasus",
      "id_kasus,global_case_id",
      "website_pengaduan_id",
      pengaduanIds,
    );

    const lihatKasusByPos = await selectEq(
      supabaseAdmin,
      "lihat_kasus",
      "id_kasus",
      "id_posbankum",
      id_posbankum,
    );

    const kasusRows = [...kasusByPos, ...kasusByPengaduan];

    const kasusIds = uniqueList([
      ...kasusRows.map((item: any) => item.id_kasus),
      ...lihatKasusByPos.map((item: any) => item.id_kasus),
    ]);

    const globalCaseIds = uniqueList(
      kasusRows.map((item: any) => item.global_case_id),
    );

    await updateIn(
      supabaseAdmin,
      "data_posbankum",
      { id_user_verifikator: null },
      "id_user_verifikator",
      profileIds,
    );

    await updateIn(
      supabaseAdmin,
      "posbankum",
      { id_user_verifikator_tagging_area: null },
      "id_user_verifikator_tagging_area",
      profileIds,
    );

    await deleteIn(
      supabaseAdmin,
      "pengaduan_lampiran",
      "id_pengaduan",
      pengaduanIds,
    );

    await deleteIn(
      supabaseAdmin,
      "pengaduan_timeline",
      "id_pengaduan",
      pengaduanIds,
    );

    await deleteIn(
      supabaseAdmin,
      "kasus_progress",
      "global_case_id",
      globalCaseIds,
    );

    await deleteIn(
      supabaseAdmin,
      "kasus_progress_mobile",
      "global_case_id",
      globalCaseIds,
    );

    await deleteIn(supabaseAdmin, "kasus_progress", "created_by", profileIds);

    await deleteEq(supabaseAdmin, "lihat_kasus", "id_posbankum", id_posbankum);

    await deleteIn(supabaseAdmin, "lihat_kasus", "id_kasus", kasusIds);

    await deleteIn(supabaseAdmin, "kasus", "id_kasus", kasusIds);

    await deleteIn(supabaseAdmin, "pengaduan", "id_pengaduan", pengaduanIds);

    await deleteEq(
      supabaseAdmin,
      "data_posbankum",
      "id_posbankum",
      id_posbankum,
    );

    await deleteEq(supabaseAdmin, "kegiatan", "id_posbankum", id_posbankum);

    await deleteEq(supabaseAdmin, "notifikasi", "id_posbankum", id_posbankum);

    await deleteEq(
      supabaseAdmin,
      "paralegal_members",
      "id_posbankum",
      id_posbankum,
    );

    await deleteIn(supabaseAdmin, "berita", "id_user", profileIds);

    await deleteIn(supabaseAdmin, "profiles", "id", profileIds);

    await deleteEq(supabaseAdmin, "posbankum", "id_posbankum", id_posbankum);

    for (const authUserId of finalAuthIds) {
      const { error: deleteAuthError } =
        await supabaseAdmin.auth.admin.deleteUser(authUserId);

      if (deleteAuthError) {
        throw new Error(
          `Data database sudah dihapus, tetapi akun Auth gagal dihapus: ${deleteAuthError.message}`,
        );
      }
    }

    return jsonResponse(
      {
        ok: true,
        message: "Akun Posbankum dan data terkait berhasil dihapus.",
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
