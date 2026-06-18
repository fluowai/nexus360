import { FormEvent, useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  Building2,
  Loader2,
  MapPinned,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { apiFetch } from "../lib/api";

type Profile = {
  id: string;
  name: string;
  placeId?: string | null;
  cid?: string | null;
  address?: string | null;
  latitude: number;
  longitude: number;
};

type GridPoint = {
  id: string;
  rowIndex: number;
  columnIndex: number;
  latitude: number;
  longitude: number;
  rank?: number | null;
  found: boolean;
  status: string;
  matchedTitle?: string | null;
};

type Scan = {
  id: string;
  keyword: string;
  status: string;
  gridSize: number;
  radiusKm: number;
  totalPoints: number;
  processedPoints: number;
  averageRank?: number | null;
  top3Percent?: number | null;
  top10Percent?: number | null;
  foundPercent?: number | null;
  error?: string | null;
  profile: Profile;
  points?: GridPoint[];
  createdAt: string;
};

const initialProfile = {
  name: "",
  placeId: "",
  cid: "",
  address: "",
  latitude: "",
  longitude: "",
};

function rankColor(rank?: number | null, status?: string) {
  if (status === "PENDING" || status === "RUNNING") return "#94a3b8";
  if (!rank) return "#dc2626";
  if (rank <= 3) return "#16a34a";
  if (rank <= 10) return "#84cc16";
  if (rank <= 20) return "#eab308";
  if (rank <= 30) return "#f97316";
  return "#dc2626";
}

function RankingMap({ scan }: { scan: Scan }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || !scan.points?.length) return;
    mapRef.current?.remove();
    const map = L.map(containerRef.current, { zoomControl: true });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap",
      maxZoom: 19,
    }).addTo(map);

    const bounds = L.latLngBounds([]);
    scan.points.forEach((point) => {
      const color = rankColor(point.rank, point.status);
      const marker = L.circleMarker([point.latitude, point.longitude], {
        radius: 18,
        color: "#ffffff",
        weight: 3,
        fillColor: color,
        fillOpacity: 0.95,
      }).addTo(map);
      marker.bindTooltip(
        `<strong>${point.rank || "—"}</strong><br/>${point.matchedTitle || "Não encontrado"}`,
        { direction: "top" },
      );
      marker.bindTooltip(String(point.rank || "×"), {
        permanent: true,
        direction: "center",
        className: "google-local-rank-label",
      });
      bounds.extend([point.latitude, point.longitude]);
    });
    map.fitBounds(bounds.pad(0.18));

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [scan]);

  return <div ref={containerRef} className="h-[520px] w-full rounded-[24px] overflow-hidden border border-gray-200" />;
}

export default function GoogleLocal() {
  const [access, setAccess] = useState<any>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [scans, setScans] = useState<Scan[]>([]);
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);
  const [profileForm, setProfileForm] = useState(initialProfile);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [scanForm, setScanForm] = useState({
    profileId: "",
    keyword: "",
    gridSize: "5",
    radiusKm: "5",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const accessResponse = await apiFetch("/api/google-local/access");
      const accessData = await accessResponse.json();
      setAccess(accessData);
      if (!accessData.enabled) return;
      const [profilesResponse, scansResponse] = await Promise.all([
        apiFetch("/api/google-local/profiles"),
        apiFetch("/api/google-local/scans"),
      ]);
      const profileData = await profilesResponse.json();
      const scanData = await scansResponse.json();
      setProfiles(profileData.profiles || []);
      setScans(scanData.scans || []);
      setScanForm((current) => ({
        ...current,
        profileId: current.profileId || profileData.profiles?.[0]?.id || "",
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!selectedScan || !["PENDING", "RUNNING"].includes(selectedScan.status)) return;
    const timer = window.setInterval(async () => {
      const response = await apiFetch(`/api/google-local/scans/${selectedScan.id}`);
      if (!response.ok) return;
      const data = await response.json();
      setSelectedScan(data.scan);
      setScans((current) => current.map((scan) => scan.id === data.scan.id ? data.scan : scan));
    }, 4000);
    return () => window.clearInterval(timer);
  }, [selectedScan?.id, selectedScan?.status]);

  const saveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await apiFetch("/api/google-local/profiles", {
        method: "POST",
        body: JSON.stringify(profileForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível cadastrar o perfil.");
      setProfiles((current) => [data.profile, ...current]);
      setScanForm((current) => ({ ...current, profileId: data.profile.id }));
      setProfileForm(initialProfile);
      setShowProfileForm(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const createScan = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const response = await apiFetch("/api/google-local/scans", {
        method: "POST",
        body: JSON.stringify(scanForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível iniciar a análise.");
      setSelectedScan(data.scan);
      setScans((current) => [data.scan, ...current]);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const openScan = async (scanId: string) => {
    const response = await apiFetch(`/api/google-local/scans/${scanId}`);
    const data = await response.json();
    if (response.ok) setSelectedScan(data.scan);
  };

  const removeProfile = async (id: string) => {
    if (!window.confirm("Excluir este perfil e todo o histórico de análises?")) return;
    const response = await apiFetch(`/api/google-local/profiles/${id}`, { method: "DELETE" });
    if (response.ok) await loadData();
  };

  if (loading) {
    return <div className="flex min-h-[400px] items-center justify-center"><Loader2 className="animate-spin text-indigo-500" /></div>;
  }

  if (!access?.enabled) {
    return (
      <div className="mx-auto max-w-2xl rounded-[32px] border border-amber-200 bg-amber-50 p-10 text-center">
        <MapPinned className="mx-auto mb-4 text-amber-600" size={48} />
        <h1 className="text-2xl font-black text-gray-900">Google Local não liberado</h1>
        <p className="mt-2 text-sm text-gray-600">Solicite ao Super Admin a liberação deste módulo para sua conta.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Google Local</h1>
          <p className="text-sm text-gray-500">Geo Grid de posicionamento no Google Maps, executado pela infraestrutura própria.</p>
        </div>
        <button onClick={() => setShowProfileForm((value) => !value)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white">
          <Plus size={18} /> Cadastrar perfil
        </button>
      </div>

      {message && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{message}</div>}

      {showProfileForm && (
        <form onSubmit={saveProfile} className="grid grid-cols-1 gap-4 rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm md:grid-cols-2">
          <input className="modal-input" required placeholder="Nome exato do negócio" value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
          <input className="modal-input" placeholder="Endereço" value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} />
          <input className="modal-input" placeholder="Place ID (recomendado)" value={profileForm.placeId} onChange={(e) => setProfileForm({ ...profileForm, placeId: e.target.value })} />
          <input className="modal-input" placeholder="CID (opcional)" value={profileForm.cid} onChange={(e) => setProfileForm({ ...profileForm, cid: e.target.value })} />
          <input className="modal-input" required type="number" step="any" placeholder="Latitude" value={profileForm.latitude} onChange={(e) => setProfileForm({ ...profileForm, latitude: e.target.value })} />
          <input className="modal-input" required type="number" step="any" placeholder="Longitude" value={profileForm.longitude} onChange={(e) => setProfileForm({ ...profileForm, longitude: e.target.value })} />
          <button disabled={saving} className="rounded-xl bg-gray-900 px-5 py-3 font-bold text-white md:col-span-2">
            {saving ? "Salvando..." : "Salvar perfil"}
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <form onSubmit={createScan} className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-3"><Search className="text-indigo-500" /><h2 className="font-black text-gray-900">Nova análise</h2></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <select required className="modal-input" value={scanForm.profileId} onChange={(e) => setScanForm({ ...scanForm, profileId: e.target.value })}>
                <option value="">Selecione o perfil</option>
                {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
              </select>
              <input required className="modal-input md:col-span-1" placeholder="Palavra-chave, ex.: dentista" value={scanForm.keyword} onChange={(e) => setScanForm({ ...scanForm, keyword: e.target.value })} />
              <select className="modal-input" value={scanForm.gridSize} onChange={(e) => setScanForm({ ...scanForm, gridSize: e.target.value })}>
                <option value="3">Grade 3 × 3</option>
                <option value="5">Grade 5 × 5</option>
                <option value="7">Grade 7 × 7</option>
              </select>
              <select className="modal-input" value={scanForm.radiusKm} onChange={(e) => setScanForm({ ...scanForm, radiusKm: e.target.value })}>
                <option value="1">Raio 1 km</option>
                <option value="2">Raio 2 km</option>
                <option value="5">Raio 5 km</option>
                <option value="10">Raio 10 km</option>
                <option value="20">Raio 20 km</option>
              </select>
            </div>
            <button disabled={saving || !profiles.length} className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">
              <Play size={17} /> Iniciar análise
            </button>
          </form>

          {selectedScan ? (
            <div className="rounded-[28px] border border-gray-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-indigo-500">{selectedScan.profile.name}</p>
                  <h2 className="text-xl font-black text-gray-900">{selectedScan.keyword}</h2>
                  <p className="text-xs text-gray-500">{selectedScan.processedPoints}/{selectedScan.totalPoints} pontos processados</p>
                </div>
                {["PENDING", "RUNNING"].includes(selectedScan.status) && <Loader2 className="animate-spin text-indigo-500" />}
              </div>
              <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ["Posição média", selectedScan.averageRank?.toFixed(1) || "—"],
                  ["Top 3", `${(selectedScan.top3Percent || 0).toFixed(0)}%`],
                  ["Top 10", `${(selectedScan.top10Percent || 0).toFixed(0)}%`],
                  ["Encontrado", `${(selectedScan.foundPercent || 0).toFixed(0)}%`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-gray-50 p-4">
                    <p className="text-[10px] font-bold uppercase text-gray-400">{label}</p>
                    <p className="text-2xl font-black text-gray-900">{value}</p>
                  </div>
                ))}
              </div>
              {selectedScan.points?.length ? <RankingMap scan={selectedScan} /> : null}
              {selectedScan.error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{selectedScan.error}</p>}
            </div>
          ) : (
            <div className="rounded-[28px] border border-dashed border-gray-300 p-16 text-center text-gray-400">
              <MapPinned className="mx-auto mb-3" size={42} />
              <p className="font-bold">Selecione ou execute uma análise para visualizar o mapa.</p>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-6">
          <div className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-4 flex items-center gap-2 font-black"><Building2 size={18} /> Perfis</h3>
            <div className="flex flex-col gap-2">
              {profiles.map((profile) => (
                <div key={profile.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3">
                  <div className="min-w-0"><p className="truncate text-sm font-bold">{profile.name}</p><p className="truncate text-[10px] text-gray-400">{profile.placeId || profile.cid || "Correspondência por nome"}</p></div>
                  <button onClick={() => removeProfile(profile.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button>
                </div>
              ))}
              {!profiles.length && <p className="text-sm text-gray-400">Nenhum perfil cadastrado.</p>}
            </div>
          </div>

          <div className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-black">Histórico</h3>
              <button onClick={loadData} className="text-gray-400 hover:text-indigo-500"><RefreshCw size={16} /></button>
            </div>
            <div className="flex max-h-[520px] flex-col gap-2 overflow-auto">
              {scans.map((scan) => (
                <button key={scan.id} onClick={() => openScan(scan.id)} className="rounded-xl border border-gray-100 p-3 text-left hover:border-indigo-200 hover:bg-indigo-50">
                  <p className="truncate text-sm font-bold text-gray-900">{scan.keyword}</p>
                  <p className="text-[10px] text-gray-500">{scan.profile.name} · {scan.gridSize}×{scan.gridSize} · {scan.status}</p>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
