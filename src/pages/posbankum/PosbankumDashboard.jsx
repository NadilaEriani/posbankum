import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiHome,
  FiFileText,
  FiClipboard,
  FiLogOut,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { supabase } from "../../lib/supabaseClient";
import "./posbankumDashboard.css";
import KelolaDataPosbankum from "./KelolaDataPosbankum";

export default function PosbankumDashboard() {
  const navigate = useNavigate();

  const [active, setActive] = useState("Beranda");
  const [checking, setChecking] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  const [profile, setProfile] = useState(null);
  const [roleErr, setRoleErr] = useState("");
  const [posbankumName, setPosbankumName] = useState("");

  // ====== Berita / List ======
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [kategori, setKategori] = useState("");
  const [kategoriOpts, setKategoriOpts] = useState([]);

  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsErr, setItemsErr] = useState("");

  const [page, setPage] = useState(1);
  const PAGE_SIZE = 4;
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const menu = useMemo(
    () => [
      { label: "Beranda", icon: <FiHome /> },
      { label: "Kelola Data Posbankum", icon: <FiFileText /> },
      { label: "Kelola Kegiatan", icon: <FiClipboard /> },
    ],
    [],
  );

  // ====== Role Guard: hanya posbankum ======
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const { data: ses } = await supabase.auth.getSession();
        if (!alive) return;

        if (!ses?.session) {
          navigate("/", { replace: true });
          return;
        }

        const { data: u } = await supabase.auth.getUser();
        const uid = u?.user?.id;
        if (!uid) {
          navigate("/", { replace: true });
          return;
        }

        // Ambil profiles untuk role check
        const { data: prof, error: profErr } = await supabase
          .from("profiles")
          .select("id, role, full_name, id_posbankum")
          .eq("id", uid)
          .maybeSingle();

        if (profErr) throw profErr;

        if (!prof) {
          setRoleErr(
            "Akun ini belum memiliki profil. Hubungi admin untuk mengaktifkan role.",
          );

          return;
        }

        if (prof.role !== "posbankum") {
          if (prof.role === "admin") {
            navigate("/admin", { replace: true });
            return;
          }
          setRoleErr("Forbidden: halaman ini hanya untuk role posbankum.");
          return;
        }

        setProfile(prof);

        if (prof?.id_posbankum) {
          const { data: pb, error: pbErr } = await supabase
            .from("posbankum")
            .select("nama")
            .eq("id_posbankum", prof.id_posbankum)
            .maybeSingle();

          if (!pbErr && pb?.nama) {
            setPosbankumName(pb.nama);
          } else {
            setPosbankumName("");
          }
        } else {
          setPosbankumName("");
        }

        // load kategori & berita setelah role valid
      } catch (e) {
        console.error(e);
        setRoleErr(e?.message || "Gagal memeriksa role/session.");
      } finally {
        if (alive) setChecking(false);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_ev, session) => {
      if (!session) navigate("/", { replace: true });
    });

    return () => {
      alive = false;
      subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/", { replace: true });
    } catch (e) {
      console.error(e);
      alert("Logout gagal. Coba lagi.");
    } finally {
      setLoggingOut(false);
    }
  };

  // ====== Helpers berita ======
  const normalizeBerita = (row) => {
    const id = row.id_berita ?? row.id ?? `${Math.random()}`;
    const title = row.judul ?? "Tanpa Judul";
    const content = row.isi ?? "";
    const createdAt = row.tgl_publish ?? null;
    const thumb = row.gambar ?? "";

    return { id, title, content, createdAt, thumb, raw: row };
  };

  const loadKategori = async () => {
    try {
      // ambil dari tabel berita (kalau ada), lalu unique client-side
      const { data, error } = await supabase
        .from("berita")
        .select("*")
        .limit(50);
      if (error) throw error;

      const cats = Array.from(
        new Set((data ?? []).map((x) => x.kategori).filter(Boolean)),
      ).sort((a, b) => String(a).localeCompare(String(b)));

      setKategoriOpts(cats);
    } catch (e) {
      // kalau tabel/kolom belum ada, tidak apa—dropdown tetap bisa kosong
      console.warn("loadKategori skipped:", e?.message);
      setKategoriOpts([]);
    }
  };

  const loadBerita = async (p, qStr, cat) => {
    setLoadingItems(true);
    setItemsErr("");

    const from = (p - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    try {
      let query = supabase.from("berita").select("*", { count: "exact" });

      if (qStr) query = query.ilike("judul", `%${qStr}%`);

      // kategori: hanya dipakai kalau kolomnya ada (kalau tidak ada, nanti fallback)
      if (cat) query = query.eq("kategori", cat);

      // ✅ sesuai ERD
      const { data, error, count } = await query
        .order("tgl_publish", { ascending: false })
        .range(from, to);

      if (error) throw error;

      setTotal(count ?? 0);
      setItems((data ?? []).map(normalizeBerita));
    } catch (e) {
      // fallback: buang filter kategori jika kolom tidak ada
      try {
        let q2 = supabase.from("berita").select("*", { count: "exact" });
        if (qStr) q2 = q2.ilike("judul", `%${qStr}%`);

        const { data, error, count } = await q2
          .order("tgl_publish", { ascending: false })
          .range(from, to);

        if (error) throw error;

        setTotal(count ?? 0);
        setItems((data ?? []).map(normalizeBerita));
      } catch (e2) {
        setItems([]);
        setTotal(0);
        setItemsErr(e2?.message || e?.message || "Gagal memuat berita.");
      }
    } finally {
      setLoadingItems(false);
    }
  };

  // reload berita saat filter berubah
  useEffect(() => {
    if (!profile || profile.role !== "posbankum") return;
    if (active !== "Beranda") return;
    setPage(1);
    loadBerita(1, debouncedQ, kategori);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, kategori, active]);

  useEffect(() => {
    if (!profile || profile.role !== "posbankum") return;
    if (active !== "Beranda") return;
    loadBerita(page, debouncedQ, kategori);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, active]);

  useEffect(() => {
    if (!profile || profile.role !== "posbankum") return;
    if (active !== "Beranda") return;
    loadKategori();
    loadBerita(1, "", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, profile]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total],
  );

  const greetName = useMemo(() => {
    if (posbankumName?.trim()) return posbankumName.trim();
    if (profile?.full_name?.trim()) return profile.full_name.trim();
    return "Posbankum";
  }, [posbankumName, profile]);

  const avatarChar = useMemo(() => {
    const n = (greetName || "P").trim();
    return (n[0] || "P").toUpperCase();
  }, [greetName]);

  if (checking) {
    return (
      <div className="pbRoot" style={{ padding: 24 }}>
        Memuat dashboard posbankum...
      </div>
    );
  }

  if (roleErr) {
    return (
      <div className="pbRoot" style={{ padding: 24 }}>
        <div className="pbErrorBox">
          <b>Gagal membuka dashboard</b>
          <div style={{ marginTop: 8 }}>{roleErr}</div>
          <div style={{ marginTop: 12 }}>
            <button
              className="pbBtn"
              onClick={() => navigate("/", { replace: true })}
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pbRoot">
      {/* SIDEBAR */}
      <aside className="pbSide">
        <div className="pbBrand">
          <div className="pbLogo">P</div>
          <div className="pbBrandText">
            <div className="pbBrandName">Posbankum</div>
            <div className="pbBrandSub">Panel Posbankum</div>
          </div>
        </div>

        <nav className="pbNav">
          {menu.map((m) => (
            <button
              key={m.label}
              className={`pbNavItem ${active === m.label ? "is-active" : ""}`}
              onClick={() => setActive(m.label)}
              type="button"
            >
              <span className="pbNavIcon">{m.icon}</span>
              <span className="pbNavLabel">{m.label}</span>
            </button>
          ))}
        </nav>

        <div className="pbSideFooter">
          <button
            className="pbDangerBtn"
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            title={loggingOut ? "Sedang logout..." : "Keluar"}
          >
            <FiLogOut /> {loggingOut ? "Keluar..." : "Keluar"}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="pbMain">
        {/* TOPBAR */}
        <header className="pbTop">
          <div className="pbTopTitle">{active}</div>

          <div className="pbGreet">
            <div className="pbAvatar">{avatarChar}</div>
            <div className="pbGreetText">
              Hai{" "}
              <b>
                {greetName === "Posbankum"
                  ? "Posbankum"
                  : `Posbankum ${greetName}`}
              </b>
            </div>
          </div>
        </header>

        {/* CONTENT */}
        {active === "Beranda" ? (
          <section className="pbContent">
            {/* 3 cards (wireframe) */}
            <div className="pbStats">
              <div className="pbStatCard">
                <div className="pbStatBlock" />
              </div>
              <div className="pbStatCard">
                <div className="pbStatBlock" />
              </div>
              <div className="pbStatCard">
                <div className="pbStatBlock" />
              </div>
            </div>

            {/* Panel besar */}
            <div className="pbBigPanel">
              <div className="pbBigInner" />
            </div>

            {/* List berita + search + filter */}
            <div className="pbListPanel">
              <div className="pbListToolbar">
                <div className="pbSearch">
                  <FiSearch className="pbSearchIcon" />
                  <input
                    className="pbSearchInput"
                    placeholder="Pencarian"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                  />
                </div>

                <select
                  className="pbSelect"
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                >
                  <option value="">Pilih kategori</option>
                  {kategoriOpts.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              {itemsErr && <div className="pbInlineErr">{itemsErr}</div>}

              <div className="pbCards">
                {loadingItems ? (
                  <>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div className="pbCard" key={i}>
                        <div className="pbThumb skel" />
                        <div className="pbCardBody">
                          <div className="pbSkLine w60" />
                          <div className="pbSkLine w90" />
                          <div className="pbSkLine w80" />
                        </div>
                      </div>
                    ))}
                  </>
                ) : items.length ? (
                  items.map((it) => (
                    <div className="pbCard" key={it.id}>
                      <div className="pbThumb">
                        {/* kalau ada thumbnail url, bisa dipakai */}
                        {it.thumb ? (
                          <img src={it.thumb} alt={it.title} />
                        ) : (
                          <div className="pbThumbPlaceholder" />
                        )}
                      </div>

                      <div className="pbCardBody">
                        <div className="pbCardTitle">{it.title}</div>
                        <div className="pbCardText">
                          {String(it.content || "").slice(0, 130)}
                          {String(it.content || "").length > 130 ? "..." : ""}
                        </div>

                        <div className="pbCardFoot">
                          <div className="pbMeta">
                            {it.category ? (
                              <span className="pbPill">{it.category}</span>
                            ) : null}
                          </div>
                          <button className="pbLinkBtn" type="button">
                            Lihat Selengkapnya
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="pbEmpty">Belum ada berita.</div>
                )}
              </div>

              {/* Pagination */}
              <div className="pbPager">
                <button
                  className="pbNavBtn"
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <FiChevronLeft />
                </button>

                <div className="pbPageNums">
                  <span className="pbPageChip">{page}</span>
                  <span className="pbPageHint">/ {totalPages}</span>
                </div>

                <button
                  className="pbNavBtn"
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  <FiChevronRight />
                </button>

                <button
                  className="pbNextText"
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </section>
        ) : active === "Kelola Data Posbankum" ? (
          <KelolaDataPosbankum profile={profile} />
        ) : (
          <div className="pbSoon">
            Halaman <b>{active}</b> belum dibuat
          </div>
        )}
      </main>
    </div>
  );
}
