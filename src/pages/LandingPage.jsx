import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

import { MdLanguage } from "react-icons/md";
import { BsTelephone, BsClock } from "react-icons/bs";
import { AiOutlineMail, AiOutlineCheck } from "react-icons/ai";
import { BiShield } from "react-icons/bi";
import { BsFillPersonCheckFill } from "react-icons/bs";
import { TbArrowBarRight } from "react-icons/tb";
import {
  FiUsers,
  FiSearch,
  FiPhone,
  FiMail,
  FiExternalLink,
} from "react-icons/fi";
import { HiArrowTrendingUp } from "react-icons/hi2";
import { SlLocationPin } from "react-icons/sl";
import { IoCloseOutline } from "react-icons/io5";

import burung from "../assets/burung.png";
import burung1 from "../assets/burung1.png";
import burung5 from "../assets/burung5.png";
import burung8 from "../assets/burung8.png";
import logo from "../assets/logo.png";
import "./landingPage.css";

const ORG_FULL = "Kantor Wilayah Kementerian Hukum Riau";
const ORG_ADDR =
  "Jl. Jend. Sudirman No.233, Sumahilang, Kec. Pekanbaru Kota, Kota Pekanbaru, Riau 28111";
const ORG_EMAIL = "humaskumriau@gmail.com";
const ORG_WA_DISPLAY = "0811-6904-422";
const ORG_WA_TEL = "628116904422";
const ORG_HOURS_DAYS = "Senin - Jumat";
const ORG_HOURS_TIME = "08:00 - 16:00 WIB";

const markerPositions = [
  { top: "22%", left: "35%" },
  { top: "46%", left: "48%" },
  { top: "28%", left: "78%" },
  { top: "63%", left: "18%" },
  { top: "57%", left: "90%" },
  { top: "38%", left: "66%" },
  { top: "72%", left: "60%" },
  { top: "30%", left: "12%" },
];

const faqItems = [
  {
    question:
      "Apa itu Pos Bantuan Hukum dan siapa yang berhak mendapatkan layanannya?",
    answer:
      "Pos Bantuan Hukum adalah layanan penyuluhan, konsultasi, dan pendampingan hukum yang diberikan secara gratis kepada masyarakat tidak mampu melalui paralegal terlatih di setiap kelurahan.",
  },
  {
    question: "Bagaimana cara mengetahui lokasi Posbankum di kelurahan saya?",
    answer:
      "Anda dapat menemukan lokasi Posbankum terdekat melalui peta interaktif di website ini atau menghubungi kantor kelurahan/desa setempat untuk informasi layanan terdekat.",
  },
  {
    question: "Apa saja tugas paralegal di Posbankum?",
    answer:
      "Paralegal Posbankum bertugas memberikan konsultasi hukum awal, membantu penyusunan dokumen sederhana, memberi informasi hak-hak hukum, dan menghubungkan masyarakat dengan layanan bantuan hukum lanjutan.",
  },
  {
    question: "Apa saja dokumen yang dikelola dalam sistem Posbankum?",
    answer:
      "Dokumen yang biasanya diperlukan antara lain KTP, Kartu Keluarga, surat keterangan tidak mampu jika ada, dan dokumen pendukung lain yang berkaitan dengan permasalahan hukum Anda.",
  },
  {
    question: "Apakah layanan Posbankum benar-benar gratis?",
    answer:
      "Ya, layanan Posbankum diberikan secara gratis untuk masyarakat yang membutuhkan bantuan hukum dan memenuhi persyaratan layanan yang berlaku.",
  },
  {
    question: "Berapa lama proses penanganan kasus di Posbankum?",
    answer:
      "Waktu penanganan kasus bervariasi tergantung kompleksitas masalah hukum. Konsultasi awal umumnya dapat dilakukan pada hari yang sama, sedangkan tindak lanjut menyesuaikan jenis kasus.",
  },
  {
    question: "Bagaimana cara menghubungi paralegal Posbankum?",
    answer:
      "Anda dapat menghubungi paralegal Posbankum melalui nomor telepon atau WhatsApp, email, atau datang langsung ke Posbankum terdekat pada jam layanan yang tersedia.",
  },
  {
    question: "Apa perbedaan antara Posbankum dengan Advokat/Pengacara?",
    answer:
      "Posbankum menyediakan layanan konsultasi awal, informasi hukum, dan pendampingan dasar secara gratis. Untuk penanganan perkara yang membutuhkan kuasa hukum di pengadilan, masyarakat dapat dirujuk ke lembaga bantuan hukum atau advokat sesuai kebutuhan.",
  },
];

const norm = (value) =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const KATEGORI_ALIASES = {
  tagging_area: "tagging_area",
  "tagging area": "tagging_area",
  "tag area": "tagging_area",
  "taging area": "tagging_area",
  taging_area: "tagging_area",
  "topping area": "tagging_area",
};

const canonKategori = (kategori) => {
  const key = norm(kategori);
  return KATEGORI_ALIASES[key] ?? key;
};

const normalizeStatus = (status) => {
  const value = norm(status);

  if (["disetujui", "setuju", "approved", "approve", "ok"].includes(value)) {
    return "disetujui";
  }

  if (["ditolak", "tolak", "rejected", "reject"].includes(value)) {
    return "ditolak";
  }

  return "menunggu";
};

const normalizeMap = (items, idKey) => {
  return (items || []).reduce((acc, item) => {
    if (item?.[idKey]) {
      acc[item[idKey]] = item.nama || "";
    }

    return acc;
  }, {});
};

const countBy = (items, key) => {
  return (items || []).reduce((acc, item) => {
    if (!item?.[key]) return acc;

    acc[item[key]] = (acc[item[key]] || 0) + 1;

    return acc;
  }, {});
};

const hasValidCoordinate = (item) => {
  const lat = Number(item?.latitude ?? item?.lat ?? item?.latitude_pos);
  const lng = Number(
    item?.longitude ?? item?.lng ?? item?.long ?? item?.longitude_pos,
  );

  return Number.isFinite(lat) && Number.isFinite(lng);
};

function Reveal({ children, className = "", direction = "up", delay = 0 }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.18 },
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`lp-reveal lp-reveal-${direction} ${
        visible ? "is-visible" : ""
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

function IconLightning() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="lp-why-icon-svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M13 2L6 13h5l-1 9 8-12h-5l0-8z" />
    </svg>
  );
}

function IconMedal() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="lp-why-icon-svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 3h7l-1.3 5.2a4.5 4.5 0 11-4.4 0L8.5 3z" />
      <path d="M9.8 14.8v5.7L12 18.9l2.2 1.6v-5.7" />
    </svg>
  );
}

function IconWorld() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="lp-why-icon-svg"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18" />
      <path d="M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

async function getRedirectPathByRole(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  if (error || !data?.role) return "/admin";
  if (data.role === "admin") return "/admin";

  if (data.role === "paralegal" || data.role === "posbankum") {
    return "/posbankum";
  }

  return "/admin";
}

function LocationCard({ item, index, active, onClick }) {
  return (
    <div
      className={`lp-location-item ${active ? "active" : ""}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
    >
      <div className="lp-location-number">{index + 1}</div>

      <div className="lp-location-content">
        <h4>{item.name}</h4>
        <p>{item.address}</p>

        <div className="lp-location-meta">
          <span className="lp-meta-pill lp-meta-status">
            <AiOutlineCheck /> {item.status}
          </span>

          <span className="lp-meta-pill lp-meta-number">
            <FiUsers /> {item.paralegalCount}
          </span>

          <span className="lp-meta-text">{item.caseCount} kasus</span>
        </div>
      </div>
    </div>
  );
}

function DetailPopup({ location, onClose }) {
  if (!location) return null;

  return (
    <div className="lp-modal-overlay" role="dialog" aria-modal="true">
      <div className="lp-detail-popup">
        <div className="lp-detail-popup-header">
          <div className="lp-detail-title-wrap">
            <img src={burung5} alt="Logo Posbankum" />

            <div>
              <h2>{location.name}</h2>

              <div className="lp-detail-subline">
                <span className="lp-detail-status">
                  <AiOutlineCheck /> {location.status}
                </span>

                <span>{location.district}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            className="lp-modal-close"
            onClick={onClose}
            aria-label="Tutup detail"
          >
            <IoCloseOutline />
          </button>
        </div>

        <div className="lp-detail-popup-body">
          <div className="lp-detail-info-row">
            <span className="lp-detail-info-icon lp-info-blue">
              <SlLocationPin />
            </span>

            <div>
              <small>Alamat</small>
              <strong>{location.address}</strong>
            </div>
          </div>

          <div className="lp-detail-info-row">
            <span className="lp-detail-info-icon lp-info-green">
              <FiPhone />
            </span>

            <div>
              <small>Telepon</small>
              <strong>{location.phone}</strong>
            </div>
          </div>

          <div className="lp-detail-info-row">
            <span className="lp-detail-info-icon lp-info-purple">
              <FiMail />
            </span>

            <div>
              <small>Email</small>
              <strong>{location.email}</strong>
            </div>
          </div>

          <div className="lp-detail-info-row">
            <span className="lp-detail-info-icon lp-info-orange">
              <BsClock />
            </span>

            <div>
              <small>Jam Operasional</small>
              <strong>{location.operationalHours}</strong>
            </div>
          </div>

          <div className="lp-detail-stats-grid">
            <div className="lp-detail-stat-box lp-detail-stat-blue">
              <span>
                <FiUsers /> Paralegal
              </span>

              <strong>{location.paralegalCount}</strong>
              <small>Aktif</small>
            </div>

            <div className="lp-detail-stat-box lp-detail-stat-purple">
              <span>
                <AiOutlineCheck /> Kasus
              </span>

              <strong>{location.caseCount}</strong>
              <small>Ditangani</small>
            </div>
          </div>

          <button
            type="button"
            className="lp-detail-map-button"
            onClick={onClose}
          >
            <FiExternalLink /> Lihat di Peta
          </button>
        </div>
      </div>
    </div>
  );
}

function AllLocationsPopup({
  locations,
  loading,
  error,
  searchValue,
  setSearchValue,
  onClose,
  onSelect,
}) {
  return (
    <div className="lp-modal-overlay" role="dialog" aria-modal="true">
      <div className="lp-all-popup">
        <div className="lp-all-popup-header">
          <div>
            <h2>Semua Lokasi Posbankum</h2>
            <p>Kota Pekanbaru, Riau</p>
          </div>

          <button
            type="button"
            className="lp-modal-close"
            onClick={onClose}
            aria-label="Tutup semua lokasi"
          >
            <IoCloseOutline />
          </button>
        </div>

        <div className="lp-all-search-wrap">
          <label className="lp-all-search">
            <FiSearch />

            <input
              type="text"
              placeholder="Cari nama atau alamat Posbankum..."
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </label>
        </div>

        <div className="lp-all-popup-body">
          {loading ? (
            <div className="lp-location-empty">
              Memuat data Posbankum dari database...
            </div>
          ) : error ? (
            <div className="lp-location-error">{error}</div>
          ) : locations.length ? (
            locations.map((item) => (
              <div className="lp-all-card" key={item.id}>
                <div className="lp-all-card-header">
                  <img src={burung5} alt="Logo Posbankum" />

                  <div>
                    <h3>{item.name}</h3>

                    <span>
                      <AiOutlineCheck /> {item.status}
                    </span>
                  </div>
                </div>

                <div className="lp-all-card-body">
                  <div className="lp-detail-info-row">
                    <span className="lp-detail-info-icon lp-info-blue">
                      <SlLocationPin />
                    </span>

                    <div>
                      <small>Alamat</small>
                      <strong>{item.address}</strong>
                    </div>
                  </div>

                  <div className="lp-detail-info-row">
                    <span className="lp-detail-info-icon lp-info-green">
                      <FiPhone />
                    </span>

                    <div>
                      <small>Telepon</small>
                      <strong>{item.phone}</strong>
                    </div>
                  </div>

                  <div className="lp-detail-info-row">
                    <span className="lp-detail-info-icon lp-info-purple">
                      <FiMail />
                    </span>

                    <div>
                      <small>Email</small>
                      <strong>{item.email}</strong>
                    </div>
                  </div>

                  <div className="lp-detail-info-row">
                    <span className="lp-detail-info-icon lp-info-orange">
                      <BsClock />
                    </span>

                    <div>
                      <small>Jam Operasional</small>
                      <strong>{item.operationalHours}</strong>
                    </div>
                  </div>

                  <div className="lp-detail-stats-grid">
                    <div className="lp-detail-stat-box lp-detail-stat-blue">
                      <span>
                        <FiUsers /> Paralegal
                      </span>

                      <strong>{item.paralegalCount}</strong>
                      <small>Aktif</small>
                    </div>

                    <div className="lp-detail-stat-box lp-detail-stat-purple">
                      <span>
                        <AiOutlineCheck /> Kasus
                      </span>

                      <strong>{item.caseCount}</strong>
                      <small>Ditangani</small>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="lp-detail-map-button"
                    onClick={() => onSelect(item)}
                  >
                    <FiExternalLink /> Lihat di Peta
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="lp-location-empty">
              Data Posbankum tidak ditemukan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  const [sessionEmail, setSessionEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  const [searchTerm, setSearchTerm] = useState("");
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [loadingPosbankum, setLoadingPosbankum] = useState(true);
  const [posbankumError, setPosbankumError] = useState("");

  const [detailPopup, setDetailPopup] = useState(null);
  const [showAllLocations, setShowAllLocations] = useState(false);
  const [allSearchTerm, setAllSearchTerm] = useState("");

  const heroRef = useRef(null);
  const whyRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSessionEmail(data?.session?.user?.email ?? "");
    };

    initSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSessionEmail(session?.user?.email ?? "");
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadPosbankum = async () => {
      setLoadingPosbankum(true);
      setPosbankumError("");

      try {
        const { data: posData, error: posError } = await supabase
          .from("posbankum")
          .select("*")
          .order("nama", { ascending: true });

        if (posError) throw posError;

        const safePosData = posData || [];
        const posIds = safePosData
          .map((item) => item.id_posbankum)
          .filter(Boolean);

        let uploads = [];

        if (posIds.length > 0) {
          const { data: uploadData, error: uploadError } = await supabase
            .from("data_posbankum")
            .select(
              "id_data,id_posbankum,kategori,path_berkas,nama_berkas,status_verifikasi,tgl_upload,created_at",
            )
            .in("id_posbankum", posIds);

          if (!uploadError) {
            uploads = uploadData || [];
          } else {
            console.warn("Gagal mengambil data_posbankum:", uploadError);
          }
        }

        const taggingByPosbankum = uploads.reduce((acc, upload) => {
          const kategori = canonKategori(upload?.kategori);

          if (kategori !== "tagging_area") return acc;
          if (!upload?.id_posbankum) return acc;

          if (!acc[upload.id_posbankum]) {
            acc[upload.id_posbankum] = [];
          }

          acc[upload.id_posbankum].push(upload);

          return acc;
        }, {});

        const taggedPosbankum = safePosData.filter((pos) => {
          const hasCoords = hasValidCoordinate(pos);
          const hasTaggingUpload =
            (taggingByPosbankum[pos.id_posbankum] || []).length > 0;

          return hasCoords || hasTaggingUpload;
        });

        const visiblePosbankum =
          taggedPosbankum.length > 0 ? taggedPosbankum : safePosData;

        const visibleIds = visiblePosbankum
          .map((item) => item.id_posbankum)
          .filter(Boolean);

        const kecamatanIds = [
          ...new Set(
            visiblePosbankum.map((item) => item.id_kecamatan).filter(Boolean),
          ),
        ];

        const kabupatenIds = [
          ...new Set(
            visiblePosbankum.map((item) => item.id_kabupaten).filter(Boolean),
          ),
        ];

        const [
          kecamatanRes,
          kabupatenRes,
          kasusRes,
          lihatKasusRes,
          paralegalRes,
        ] = await Promise.all([
          kecamatanIds.length
            ? supabase
                .from("kecamatan")
                .select("id_kecamatan,nama")
                .in("id_kecamatan", kecamatanIds)
            : Promise.resolve({ data: [], error: null }),

          kabupatenIds.length
            ? supabase
                .from("kabupaten")
                .select("id_kabupaten,nama")
                .in("id_kabupaten", kabupatenIds)
            : Promise.resolve({ data: [], error: null }),

          visibleIds.length
            ? supabase
                .from("kasus")
                .select("id_kasus,id_posbankum")
                .in("id_posbankum", visibleIds)
            : Promise.resolve({ data: [], error: null }),

          visibleIds.length
            ? supabase
                .from("lihat_kasus")
                .select("id_kasus,id_posbankum")
                .in("id_posbankum", visibleIds)
            : Promise.resolve({ data: [], error: null }),

          visibleIds.length
            ? supabase
                .from("paralegal_members")
                .select("id_posbankum")
                .in("id_posbankum", visibleIds)
            : Promise.resolve({ data: [], error: null }),
        ]);

        if (kecamatanRes.error) {
          console.warn("Gagal mengambil kecamatan:", kecamatanRes.error);
        }

        if (kabupatenRes.error) {
          console.warn("Gagal mengambil kabupaten:", kabupatenRes.error);
        }

        if (kasusRes.error) {
          console.warn("Gagal mengambil kasus:", kasusRes.error);
        }

        if (lihatKasusRes.error) {
          console.warn("Gagal mengambil lihat_kasus:", lihatKasusRes.error);
        }

        if (paralegalRes.error) {
          console.warn(
            "Gagal mengambil paralegal_members:",
            paralegalRes.error,
          );
        }

        const kecamatanMap = normalizeMap(kecamatanRes.data, "id_kecamatan");

        const kabupatenMap = normalizeMap(kabupatenRes.data, "id_kabupaten");

        const paralegalCounts = countBy(paralegalRes.data, "id_posbankum");

        const caseSets = {};

        [...(kasusRes.data || []), ...(lihatKasusRes.data || [])].forEach(
          (item) => {
            if (!item.id_posbankum || !item.id_kasus) return;

            if (!caseSets[item.id_posbankum]) {
              caseSets[item.id_posbankum] = new Set();
            }

            caseSets[item.id_posbankum].add(item.id_kasus);
          },
        );

        const kasusCounts = Object.fromEntries(
          Object.entries(caseSets).map(([id, caseSet]) => [id, caseSet.size]),
        );

        const mapped = visiblePosbankum.map((item, index) => {
          const kecamatanName = kecamatanMap[item.id_kecamatan] || "";
          const kabupatenName = kabupatenMap[item.id_kabupaten] || "";
          const taggingUploads = taggingByPosbankum[item.id_posbankum] || [];
          const hasCoords = hasValidCoordinate(item);

          return {
            id: item.id_posbankum,
            name: item.nama || `Posbankum ${index + 1}`,
            district: kecamatanName || kabupatenName || "Provinsi Riau",
            region: kabupatenName || "Riau",
            address: item.alamat || "Alamat belum tersedia",
            paralegalCount:
              Number(item.jml_paralegal) > 0
                ? Number(item.jml_paralegal)
                : paralegalCounts[item.id_posbankum] || 0,
            caseCount: kasusCounts[item.id_posbankum] || 0,
            phone: item.nomor_tlp || "-",
            email: item.email_akun || "-",
            latitude: item.latitude,
            longitude: item.longitude,
            status: "Aktif",
            operationalHours: `${ORG_HOURS_DAYS}, ${ORG_HOURS_TIME}`,
            hasTaggingArea: hasCoords || taggingUploads.length > 0,
            taggingStatus:
              taggingUploads[0]?.status_verifikasi ||
              (hasCoords ? "menunggu" : "menunggu"),
          };
        });

        if (!isMounted) return;

        setLocations(mapped);
        setSelectedLocation(mapped[0] || null);

        if (mapped.length === 0) {
          setPosbankumError(
            "Belum ada data Posbankum yang memiliki Tagging Area.",
          );
        }
      } catch (error) {
        console.error("Gagal mengambil data posbankum:", error);

        if (!isMounted) return;

        setLocations([]);
        setSelectedLocation(null);
        setPosbankumError(
          "Gagal mengambil data Posbankum dari database. Periksa koneksi Supabase atau RLS policy.",
        );
      } finally {
        if (isMounted) {
          setLoadingPosbankum(false);
        }
      }
    };

    loadPosbankum();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredLocations = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) return locations;

    return locations.filter((item) => {
      const combined =
        `${item.name} ${item.district} ${item.address}`.toLowerCase();

      return combined.includes(keyword);
    });
  }, [locations, searchTerm]);

  const filteredAllLocations = useMemo(() => {
    const keyword = allSearchTerm.trim().toLowerCase();

    if (!keyword) return locations;

    return locations.filter((item) => {
      const combined =
        `${item.name} ${item.district} ${item.address} ${item.phone} ${item.email}`.toLowerCase();

      return combined.includes(keyword);
    });
  }, [locations, allSearchTerm]);

  useEffect(() => {
    if (!filteredLocations.length) {
      setSelectedLocation(null);
      return;
    }

    const exists = filteredLocations.find(
      (item) => item.id === selectedLocation?.id,
    );

    if (!exists) {
      setSelectedLocation(filteredLocations[0]);
    }
  }, [filteredLocations, selectedLocation]);

  const goDashboard = async () => {
    setLoading(true);

    const { data } = await supabase.auth.getSession();
    const userId = data?.session?.user?.id;

    if (!userId) {
      setLoading(false);
      navigate("/login");
      return;
    }

    const path = await getRedirectPathByRole(userId);

    setLoading(false);
    navigate(path);
  };

  const onLogout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  const scrollToRef = (ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const selectLocationFromPopup = (item) => {
    setSelectedLocation(item);
    setShowAllLocations(false);
    setDetailPopup(item);
  };

  return (
    <div className="lp-page">
      <div className="lp-topbar">
        <div className="lp-container lp-topbar-inner">
          <div className="lp-topbar-left">
            <a className="lp-topbar-link" href={`mailto:${ORG_EMAIL}`}>
              <AiOutlineMail />
              <span>{ORG_EMAIL}</span>
            </a>

            <a
              className="lp-topbar-link"
              href={`https://wa.me/${ORG_WA_TEL}`}
              target="_blank"
              rel="noreferrer"
            >
              <BsTelephone />
              <span>{ORG_WA_DISPLAY}</span>
            </a>
          </div>

          <div className="lp-topbar-right">
            <span>
              <MdLanguage />
              <strong>ID</strong> | EN
            </span>
          </div>
        </div>
      </div>

      <header className="lp-header">
        <div className="lp-container lp-header-inner">
          <Link to="/" className="lp-brand">
            <span className="lp-brand-logo">
              <img src={logo} alt="Logo Pengayoman" />
            </span>

            <span className="lp-brand-divider" aria-hidden="true"></span>

            <span className="lp-brand-bird">
              <img src={burung5} alt="Logo SiBapak" />
            </span>

            <span className="lp-brand-title">SiBapak</span>
          </Link>

          {!sessionEmail ? (
            <Link to="/login" className="lp-btn-login">
              <TbArrowBarRight className="lp-login-icon" />
              Masuk
            </Link>
          ) : (
            <div className="lp-header-actions">
              <button
                className="lp-btn-login"
                onClick={goDashboard}
                disabled={loading}
              >
                {loading ? "..." : "Dashboard"}
              </button>

              <button
                className="lp-btn-danger"
                onClick={onLogout}
                disabled={loading}
              >
                Keluar
              </button>
            </div>
          )}
        </div>
      </header>

      <main>
        <section className="lp-section lp-hero" ref={heroRef}>
          <div className="lp-container">
            <div className="lp-hero-grid">
              <Reveal className="lp-hero-left" direction="left">
                <div className="lp-hero-card">
                  <img
                    src={burung}
                    alt="Maskot Posbankum"
                    className="lp-hero-bird"
                  />

                  <div className="lp-hero-name">
                    <strong>Posbankum</strong>
                    <span>Kanwil Kemenkum Riau</span>
                  </div>
                </div>
              </Reveal>

              <Reveal direction="right">
                <div className="lp-badge">
                  <span className="lp-badge-dot"></span>
                  {ORG_FULL}
                </div>

                <h1 className="lp-hero-title">
                  Ayo Cek Data <span>Posbankum</span>
                  <br />
                  di Wilayah Anda
                </h1>

                <p className="lp-hero-desc">
                  Temukan informasi lengkap Pos Bantuan Hukum (Posbankum) di
                  desa atau kelurahan Anda. Akses data paralegal aktif, dokumen
                  hukum, hingga kegiatan Posbankum terbaru dengan mudah dan
                  cepat.
                </p>

                <div className="lp-hero-stats">
                  <div className="lp-stat">
                    <div className="lp-stat-icon lp-stat-green">
                      <AiOutlineCheck />
                    </div>

                    <div className="lp-stat-text">
                      Data Real-time &amp; Akurat
                    </div>
                  </div>

                  <div className="lp-stat">
                    <div className="lp-stat-icon lp-stat-blue">
                      <BiShield />
                    </div>

                    <div className="lp-stat-text">Resmi Pemerintah</div>
                  </div>

                  <div className="lp-stat">
                    <div className="lp-stat-icon lp-stat-blue-2">
                      <FiUsers />
                    </div>

                    <div className="lp-stat-text">1K+ Paralegal Terlatih</div>
                  </div>

                  <div className="lp-stat">
                    <div className="lp-stat-icon lp-stat-orange">
                      <HiArrowTrendingUp />
                    </div>

                    <div className="lp-stat-text">100+ Kasus Ditangani</div>
                  </div>
                </div>

                <div className="lp-hero-actions">
                  <button
                    className="lp-btn-primary"
                    onClick={() => scrollToRef(mapRef)}
                  >
                    <SlLocationPin />
                    Lihat Posbankum Terdekat
                    <TbArrowBarRight />
                  </button>

                  <button
                    className="lp-btn-outline"
                    onClick={() => scrollToRef(whyRef)}
                  >
                    Pelajari Lebih Lanjut
                  </button>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="lp-section" ref={whyRef}>
          <div className="lp-container">
            <Reveal className="lp-center-head" direction="down">
              <div className="lp-label-pill">KEUNGGULAN LAYANAN</div>

              <h2 className="lp-section-title">Mengapa Memilih Kami?</h2>

              <p className="lp-section-subtitle">
                Posbankum hadir untuk memberikan akses keadilan yang merata bagi
                seluruh lapisan masyarakat.
              </p>
            </Reveal>

            <div className="lp-why-grid">
              <Reveal direction="up" delay={40}>
                <div className="lp-why-card lp-why-card-blue">
                  <div className="lp-why-icon">
                    <IconLightning />
                  </div>

                  <h3>Akses Mudah &amp; Cepat</h3>

                  <p>
                    Layanan bantuan hukum yang mudah diakses kapan saja dan di
                    mana saja.
                  </p>
                </div>
              </Reveal>

              <Reveal direction="up" delay={120}>
                <div className="lp-why-card lp-why-card-orange">
                  <div className="lp-why-icon">
                    <IconMedal />
                  </div>

                  <h3>Paralegal Berpengalaman</h3>

                  <p>Didampingi paralegal terlatih dan bersertifikat resmi.</p>
                </div>
              </Reveal>

              <Reveal direction="up" delay={200}>
                <div className="lp-why-card lp-why-card-green">
                  <div className="lp-why-icon">
                    <IconWorld />
                  </div>

                  <h3>Jangkauan Luas</h3>

                  <p>
                    Tersebar di seluruh desa dan kelurahan di Provinsi Riau.
                  </p>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="lp-section lp-service-section">
          <div className="lp-container">
            <div className="lp-service-grid">
              <Reveal direction="right">
                <div>
                  <div className="lp-green-badge">
                    <BiShield /> LAYANAN MASYARAKAT
                  </div>

                  <h2 className="lp-blue-title">
                    Akses Bantuan Hukum <span>Gratis</span>
                  </h2>

                  <p className="lp-section-copy">
                    Kanwil Kemenkum Riau melalui Posbankum menyediakan layanan
                    bantuan hukum gratis untuk masyarakat kurang mampu.
                    Posbankum hadir di setiap kelurahan untuk memastikan
                    keadilan dapat diakses oleh seluruh lapisan masyarakat.
                  </p>

                  <div className="lp-service-list">
                    <div className="lp-service-item">
                      <div className="lp-service-item-icon">
                        <BiShield />
                      </div>
                      Konsultasi hukum gratis dan konfidensial
                    </div>

                    <div className="lp-service-item">
                      <div className="lp-service-item-icon">
                        <BsFillPersonCheckFill />
                      </div>
                      Pendampingan hukum di pengadilan
                    </div>

                    <div className="lp-service-item">
                      <div className="lp-service-item-icon">
                        <AiOutlineCheck />
                      </div>
                      Mediasi &amp; penyelesaian sengketa
                    </div>
                  </div>
                </div>
              </Reveal>

              <Reveal direction="left">
                <div className="lp-service-visual">
                  <div className="lp-service-circle">
                    <img src={burung8} alt="Bantuan Hukum Gratis" />
                  </div>

                  <div className="lp-service-footer">
                    <strong>Bantuan Hukum Gratis</strong>
                    <span>Untuk Seluruh Masyarakat</span>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="lp-section lp-info-section">
          <div className="lp-container">
            <div className="lp-info-grid">
              <Reveal direction="left">
                <div className="lp-info-card">
                  <div className="lp-online-badge">
                    <span className="lp-online-dot"></span>
                    Online
                  </div>

                  <div className="lp-info-visual">
                    <img src={burung1} alt="Platform Digital Posbankum" />
                  </div>

                  <div className="lp-info-footer">
                    <strong>Platform Digital Terintegrasi</strong>
                    <span>Akses Informasi 24/7</span>
                  </div>
                </div>
              </Reveal>

              <Reveal direction="right">
                <div>
                  <div className="lp-red-badge">
                    <SlLocationPin /> PUSAT INFORMASI
                  </div>

                  <h2 className="lp-blue-title">
                    Pusat Informasi Layanan Hukum
                  </h2>

                  <p className="lp-section-copy">
                    Akses informasi lengkap tentang prosedur bantuan hukum,
                    hak-hak Anda sebagai warga negara, dan informasi hukum
                    terkini dari paralegal profesional yang tersebar di seluruh
                    Indonesia.
                  </p>

                  <a
                    className="lp-red-button"
                    href={`https://wa.me/${ORG_WA_TEL}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Hubungi Paralegal <TbArrowBarRight />
                  </a>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="lp-section lp-map-section" ref={mapRef}>
          <div className="lp-container">
            <Reveal className="lp-center-head" direction="down">
              <div className="lp-map-badge">
                <SlLocationPin /> PETA LOKASI INTERAKTIF
              </div>

              <h2 className="lp-map-title">Temukan Posbankum Terdekat</h2>

              <p className="lp-section-subtitle">
                Jelajahi peta interaktif dan temukan lokasi Pos Bantuan Hukum di
                seluruh wilayah Provinsi Riau.
              </p>
            </Reveal>

            <div className="lp-map-grid">
              <Reveal direction="left">
                <div className="lp-map-shell">
                  <div className="lp-map-toolbar">
                    <label className="lp-map-search">
                      <FiSearch />

                      <input
                        type="text"
                        placeholder="Cari Posbankum di Pekanbaru..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                      />
                    </label>

                    <div className="lp-map-count">
                      <span className="lp-map-count-dot"></span>
                      {loadingPosbankum
                        ? "Memuat..."
                        : `${filteredLocations.length} Lokasi`}
                    </div>
                  </div>

                  <div className="lp-fake-map">
                    <div className="lp-road-h road-1"></div>
                    <div className="lp-road-h road-2"></div>
                    <div className="lp-road-h road-3"></div>
                    <div className="lp-road-h road-4"></div>
                    <div className="lp-road-v road-5"></div>
                    <div className="lp-road-v road-6"></div>
                    <div className="lp-road-v road-7"></div>
                    <div className="lp-road-v road-8"></div>

                    <div className="lp-block-green block-1">Taman</div>
                    <div className="lp-block-green block-2"></div>

                    <div className="lp-river">Sungai Siak</div>

                    <div className="lp-map-label label-1">
                      Jl. HR Soebrantas
                    </div>
                    <div className="lp-map-label label-2">Jl. Arifin Ahmad</div>
                    <div className="lp-map-label label-3">
                      Jl. Kaharuddin Nasution
                    </div>
                    <div className="lp-map-label label-4">Jl. Riau</div>
                    <div className="lp-map-label label-5">Jl. Garuda Sakti</div>

                    {filteredLocations
                      .slice(0, markerPositions.length)
                      .map((item, index) => {
                        const marker = markerPositions[index];
                        const active = item.id === selectedLocation?.id;

                        return (
                          <button
                            key={item.id}
                            type="button"
                            className={`lp-map-pin ${active ? "active" : ""}`}
                            style={{
                              top: marker.top,
                              left: marker.left,
                            }}
                            onClick={() => {
                              setSelectedLocation(item);
                              setDetailPopup(item);
                            }}
                            aria-label={item.name}
                          >
                            <span>
                              <SlLocationPin />
                            </span>
                          </button>
                        );
                      })}

                    <div className="lp-map-compass">N</div>

                    <div className="lp-map-zoom">
                      <button type="button">+</button>
                      <button type="button">−</button>
                    </div>

                    <div className="lp-map-scale">2 km</div>
                    <div className="lp-map-layer">Layer</div>
                  </div>
                </div>
              </Reveal>

              <Reveal direction="right">
                <div className="lp-location-panel">
                  <div className="lp-location-header">
                    <div>
                      <h3>Daftar Posbankum</h3>

                      <p>
                        {selectedLocation?.district || "Kota Pekanbaru, Riau"}
                      </p>
                    </div>

                    <button
                      type="button"
                      className="lp-see-all-button"
                      onClick={() => setShowAllLocations(true)}
                    >
                      Lihat Semua Lokasi
                    </button>
                  </div>

                  <div className="lp-location-list">
                    {loadingPosbankum ? (
                      <div className="lp-location-empty">
                        Memuat data Posbankum dari database...
                      </div>
                    ) : posbankumError ? (
                      <div className="lp-location-error">{posbankumError}</div>
                    ) : filteredLocations.length ? (
                      filteredLocations.slice(0, 5).map((item, index) => (
                        <LocationCard
                          key={item.id}
                          item={item}
                          index={index}
                          active={item.id === selectedLocation?.id}
                          onClick={() => {
                            setSelectedLocation(item);
                            setDetailPopup(item);
                          }}
                        />
                      ))
                    ) : (
                      <div className="lp-location-empty">
                        Data Posbankum tidak ditemukan.
                      </div>
                    )}
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        <section className="lp-section">
          <div className="lp-container">
            <div className="lp-faq-wrap">
              <div className="lp-center-head">
                <div className="lp-faq-badge">FAQ</div>

                <h2 className="lp-faq-title">
                  Pertanyaan yang Sering Diajukan
                </h2>

                <p className="lp-faq-copy">
                  Temukan jawaban dari pertanyaan umum seputar layanan
                  Posbankum, alur akses layanan, lokasi hingga informasi bantuan
                  hukum bagi masyarakat.
                </p>
              </div>

              <div className="lp-faq-list">
                {faqItems.map((item, index) => {
                  const open = openFaq === index;

                  return (
                    <div className="lp-faq-item" key={item.question}>
                      <button
                        type="button"
                        className="lp-faq-button"
                        onClick={() => setOpenFaq(open ? null : index)}
                      >
                        <div className="lp-faq-button-left">
                          <span className="lp-faq-icon-wrap">?</span>

                          <span className="lp-faq-question">
                            {item.question}
                          </span>
                        </div>

                        <span className={`lp-faq-arrow ${open ? "open" : ""}`}>
                          ⌄
                        </span>
                      </button>

                      {open ? (
                        <div className="lp-faq-answer">{item.answer}</div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="lp-section lp-cta-section">
          <div className="lp-container">
            <div className="lp-cta-box">
              <h2 className="lp-cta-title">Masih Ada Pertanyaan?</h2>

              <p className="lp-cta-copy">
                Tim kami siap membantu Anda. Hubungi kami melalui email atau
                telepon untuk informasi lebih lanjut.
              </p>

              <a
                className="lp-contact-button"
                href={`https://wa.me/${ORG_WA_TEL}`}
                target="_blank"
                rel="noreferrer"
              >
                <BsTelephone /> Hubungi Kami
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-footer-grid">
            <div className="lp-footer-brand">
              <div className="lp-footer-logo">
                <img src={logo} alt="Logo Posbankum" />
                <span>SiBapak</span>
              </div>

              <p className="lp-footer-copy">
                Pos Bantuan Hukum yang tersebar di seluruh Indonesia untuk
                memberikan akses keadilan bagi masyarakat.
              </p>
            </div>

            <div className="lp-footer-col">
              <h4>Tautan Cepat</h4>
              <a href="#">Tentang Kami</a>
              <a href="#">Layanan</a>
              <a href="#">Kontak</a>
            </div>

            <div className="lp-footer-col">
              <h4>Layanan Kami</h4>
              <a href="#">Cek Posbankum</a>
              <a href="#">Data Paralegal</a>
              <a href="#">Dokumen Hukum</a>
              <a href="#">Pengaduan</a>
            </div>

            <div className="lp-footer-col">
              <h4>Hubungi Kami</h4>
              <span>{ORG_EMAIL}</span>
              <span>{ORG_WA_DISPLAY}</span>
              <span>{ORG_HOURS_TIME}</span>
              <span>{ORG_ADDR}</span>
            </div>
          </div>

          <div className="lp-footer-bottom">
            <span>
              © 2026 Posbankum - Kementerian Hukum RI. All rights reserved.
            </span>

            <span>Kebijakan Privasi | Syarat &amp; Ketentuan</span>
          </div>
        </div>
      </footer>

      <a
        className="lp-float-chat"
        href={`https://wa.me/${ORG_WA_TEL}`}
        target="_blank"
        rel="noreferrer"
        aria-label="Hubungi Posbankum"
      >
        <BsTelephone />
      </a>

      <DetailPopup
        location={detailPopup}
        onClose={() => setDetailPopup(null)}
      />

      {showAllLocations ? (
        <AllLocationsPopup
          locations={filteredAllLocations}
          loading={loadingPosbankum}
          error={posbankumError}
          searchValue={allSearchTerm}
          setSearchValue={setAllSearchTerm}
          onClose={() => setShowAllLocations(false)}
          onSelect={selectLocationFromPopup}
        />
      ) : null}
    </div>
  );
}
