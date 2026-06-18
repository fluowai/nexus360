import { PrismaClient } from "@prisma/client";

type GridCoordinate = {
  rowIndex: number;
  columnIndex: number;
  latitude: number;
  longitude: number;
};

type ScraperRow = Record<string, string>;

const activeExecutions = new Set<string>();

function normalize(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function generateGrid(
  centerLat: number,
  centerLon: number,
  gridSize: number,
  radiusKm: number,
): GridCoordinate[] {
  const half = (gridSize - 1) / 2;
  const latStep = radiusKm / Math.max(half, 1) / 110.574;
  const lonKm = Math.max(111.320 * Math.cos((centerLat * Math.PI) / 180), 0.01);
  const lonStep = radiusKm / Math.max(half, 1) / lonKm;
  const points: GridCoordinate[] = [];

  for (let row = 0; row < gridSize; row += 1) {
    for (let column = 0; column < gridSize; column += 1) {
      points.push({
        rowIndex: row,
        columnIndex: column,
        latitude: centerLat + (half - row) * latStep,
        longitude: centerLon + (column - half) * lonStep,
      });
    }
  }

  return points;
}

function parseCsv(input: string): ScraperRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    const next = input[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      field = "";
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift() || [];
  return rows.map((values) =>
    headers.reduce<ScraperRow>((result, header, index) => {
      result[header] = values[index] || "";
      return result;
    }, {}),
  );
}

function scraperConfig() {
  return {
    baseUrl: (process.env.GOOGLE_MAPS_SCRAPER_URL || "http://google-maps-scraper:8080").replace(/\/$/, ""),
    pollMs: Math.max(Number(process.env.GOOGLE_MAPS_SCRAPER_POLL_MS) || 2500, 500),
    timeoutMs: Math.max(Number(process.env.GOOGLE_MAPS_SCRAPER_JOB_TIMEOUT_MS) || 180000, 30000),
  };
}

async function scraperRequest(path: string, options: RequestInit = {}) {
  const { baseUrl } = scraperConfig();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Scraper indisponível em ${baseUrl}: ${message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Scraper HTTP ${response.status}: ${details.slice(0, 500)}`);
  }

  return response;
}

export async function startProfileDiscovery(query: string) {
  const cleanQuery = query.trim();
  if (!cleanQuery) throw new Error("Informe o nome do perfil, cidade ou URL do Google Maps.");
  const created = await scraperRequest("/api/v1/jobs", {
    method: "POST",
    body: JSON.stringify({
      name: `Nexus Profile Discovery - ${cleanQuery.slice(0, 80)}`,
      keywords: [cleanQuery],
      lang: "pt",
      zoom: 15,
      fast_mode: false,
      radius: 50000,
      depth: 1,
      email: false,
      max_time: 180,
    }),
  });
  const { id } = await created.json() as { id: string };
  if (!id) throw new Error("O scraper não retornou o identificador da busca.");
  return id;
}

function numberValue(value: unknown) {
  const parsed = Number(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function profileCandidateFromGoogleMapsUrl(url: string, fallbackName?: string) {
  const cleanUrl = String(url || "").trim();
  if (!cleanUrl) return null;

  const atCoordinates = cleanUrl.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const queryCoordinates = cleanUrl.match(/[?&](?:q|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  const coordinates = atCoordinates || queryCoordinates;
  if (!coordinates) return null;

  const latitude = Number(coordinates[1]);
  const longitude = Number(coordinates[2]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  let name = String(fallbackName || "").trim();
  if (!name) {
    const placeMatch = cleanUrl.match(/\/place\/([^/@?]+)/);
    if (placeMatch?.[1]) {
      name = decodeURIComponent(placeMatch[1].replace(/\+/g, " ")).trim();
    }
  }

  return {
    name: name || "Perfil do Google Maps",
    placeId: null,
    cid: null,
    address: null,
    sourceUrl: cleanUrl,
    category: null,
    phone: null,
    website: null,
    rating: null,
    reviewsCount: null,
    latitude,
    longitude,
    description: null,
    openHours: null,
    thumbnail: null,
    rawData: {
      title: name || "Perfil do Google Maps",
      link: cleanUrl,
      latitude: String(latitude),
      longitude: String(longitude),
      source: "GOOGLE_MAPS_URL_FALLBACK",
    },
  };
}

export function normalizeProfileCandidate(row: ScraperRow) {
  return {
    name: row.title || "",
    placeId: row.place_id || null,
    cid: row.cid || null,
    address: row.address || null,
    sourceUrl: row.link || null,
    category: row.category || null,
    phone: row.phone || null,
    website: row.website || row.web_site || null,
    rating: numberValue(row.review_rating),
    reviewsCount: numberValue(row.review_count),
    latitude: numberValue(row.latitude),
    longitude: numberValue(row.longitude || row.longtitude),
    description: row.descriptions || row.description || null,
    openHours: row.open_hours || null,
    thumbnail: row.thumbnail || null,
    rawData: row,
  };
}

export async function getProfileDiscovery(jobId: string) {
  const statusResponse = await scraperRequest(`/api/v1/jobs/${encodeURIComponent(jobId)}`);
  const job = await statusResponse.json() as { status?: string };
  if (job.status === "failed") return { status: "FAILED", candidates: [] };
  if (job.status !== "ok" && job.status !== "completed") return { status: "RUNNING", candidates: [] };
  const csvResponse = await scraperRequest(`/api/v1/jobs/${encodeURIComponent(jobId)}/download`);
  const rows = parseCsv(await csvResponse.text());
  return {
    status: "COMPLETED",
    candidates: rows.map(normalizeProfileCandidate).filter((item) =>
      item.name && item.latitude !== null && item.longitude !== null,
    ).slice(0, 20),
  };
}

function hasJsonContent(value: unknown) {
  const text = String(value || "").trim();
  return text !== "" && text !== "{}" && text !== "[]" && text !== "null";
}

export function auditGoogleProfile(candidate: ReturnType<typeof normalizeProfileCandidate>) {
  const checks = [
    { key: "identity", label: "Nome e identidade do perfil", weight: 10, passed: Boolean(candidate.name) },
    { key: "category", label: "Categoria principal configurada", weight: 12, passed: Boolean(candidate.category) },
    { key: "address", label: "Endereço completo", weight: 10, passed: Boolean(candidate.address) },
    { key: "phone", label: "Telefone disponível", weight: 10, passed: Boolean(candidate.phone) },
    { key: "website", label: "Site vinculado", weight: 12, passed: Boolean(candidate.website) },
    { key: "description", label: "Descrição do negócio", weight: 10, passed: Boolean(candidate.description) },
    { key: "hours", label: "Horários de funcionamento", weight: 10, passed: hasJsonContent(candidate.openHours) },
    { key: "rating", label: "Avaliação igual ou superior a 4,0", weight: 10, passed: (candidate.rating || 0) >= 4 },
    { key: "reviews", label: "Volume mínimo de 20 avaliações", weight: 10, passed: (candidate.reviewsCount || 0) >= 20 },
    { key: "image", label: "Imagem principal disponível", weight: 6, passed: Boolean(candidate.thumbnail) },
  ];
  const score = checks.reduce((total, check) => total + (check.passed ? check.weight : 0), 0);
  const recommendations = checks
    .filter((check) => !check.passed)
    .map((check) => {
      const actions: Record<string, string> = {
        category: "Revise a categoria principal e adicione categorias secundárias relevantes.",
        address: "Complete e valide o endereço exibido no Google.",
        phone: "Adicione um telefone local e mantenha-o atualizado.",
        website: "Vincule o site oficial com uma página específica para a localidade.",
        description: "Escreva uma descrição clara com serviços, diferenciais e região atendida.",
        hours: "Cadastre horários regulares e horários especiais.",
        rating: "Crie uma rotina de solicitação e resposta de avaliações.",
        reviews: "Aumente o volume de avaliações recentes e autênticas.",
        image: "Adicione logo, capa, fachada e fotos recentes.",
      };
      return actions[check.key] || `Complete o item: ${check.label}.`;
    });
  return {
    score,
    level: score >= 85 ? "EXCELENTE" : score >= 70 ? "BOM" : score >= 50 ? "REGULAR" : "CRÍTICO",
    checks,
    recommendations,
    summary: {
      rating: candidate.rating,
      reviewsCount: candidate.reviewsCount,
      category: candidate.category,
      website: candidate.website,
      phone: candidate.phone,
    },
  };
}

async function scrapePoint(keyword: string, latitude: number, longitude: number, zoom: number) {
  const created = await scraperRequest("/api/v1/jobs", {
    method: "POST",
    body: JSON.stringify({
      name: `Nexus Geo Grid - ${keyword}`,
      keywords: [keyword],
      lang: "pt",
      zoom,
      lat: String(latitude),
      lon: String(longitude),
      fast_mode: true,
      radius: 50000,
      depth: 1,
      email: false,
      max_time: 180,
    }),
  });
  const { id } = await created.json() as { id: string };
  if (!id) throw new Error("O scraper não retornou o identificador do trabalho.");

  const startedAt = Date.now();
  const { pollMs, timeoutMs } = scraperConfig();
  while (Date.now() - startedAt < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, pollMs));
    const statusResponse = await scraperRequest(`/api/v1/jobs/${id}`);
    const job = await statusResponse.json() as { status?: string };
    if (job.status === "failed") throw new Error("O scraper falhou ao processar o ponto.");
    if (job.status === "ok" || job.status === "completed") {
      const csvResponse = await scraperRequest(`/api/v1/jobs/${id}/download`);
      return { jobId: id, rows: parseCsv(await csvResponse.text()) };
    }
  }

  throw new Error("Tempo limite excedido ao consultar o Google Maps.");
}

function findProfile(rows: ScraperRow[], profile: { name: string; placeId: string | null; cid: string | null }) {
  const expectedName = normalize(profile.name);
  return rows.find((row) => {
    if (profile.placeId && row.place_id === profile.placeId) return true;
    if (profile.cid && row.cid === profile.cid) return true;
    return normalize(row.title) === expectedName;
  });
}

async function processPoint(prisma: PrismaClient, scan: any, point: any) {
  try {
    const { jobId, rows } = await scrapePoint(
      scan.keyword,
      point.latitude,
      point.longitude,
      scan.zoom,
    );
    const matched = findProfile(rows, scan.profile);
    const rankValue = matched ? Number(matched.rank || rows.indexOf(matched) + 1) : null;
    const rank = rankValue && Number.isFinite(rankValue) ? rankValue : null;

    await prisma.googleLocalGridPoint.update({
      where: { id: point.id },
      data: {
        scraperJobId: jobId,
        status: "COMPLETED",
        found: Boolean(matched),
        rank,
        matchedTitle: matched?.title || null,
        matchedPlaceId: matched?.place_id || null,
        matchedCid: matched?.cid || null,
        rawResult: matched || undefined,
      },
    });
  } catch (error) {
    await prisma.googleLocalGridPoint.update({
      where: { id: point.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
      },
    });
  } finally {
    await prisma.googleLocalScan.update({
      where: { id: scan.id },
      data: { processedPoints: { increment: 1 } },
    });
  }
}

export async function executeGoogleLocalScan(prisma: PrismaClient, scanId: string) {
  if (activeExecutions.has(scanId)) return;
  activeExecutions.add(scanId);

  try {
    const scan = await prisma.googleLocalScan.findUnique({
      where: { id: scanId },
      include: { profile: true, points: { orderBy: [{ rowIndex: "asc" }, { columnIndex: "asc" }] } },
    });
    if (!scan || ["COMPLETED", "RUNNING"].includes(scan.status)) return;

    await prisma.googleLocalScan.update({
      where: { id: scanId },
      data: { status: "RUNNING", startedAt: new Date(), error: null },
    });

    const concurrency = Math.min(Math.max(Number(process.env.GOOGLE_MAPS_SCRAPER_CONCURRENCY) || 2, 1), 5);
    let cursor = 0;
    const workers = Array.from({ length: concurrency }, async () => {
      while (cursor < scan.points.length) {
        const point = scan.points[cursor];
        cursor += 1;
        await processPoint(prisma, scan, point);
      }
    });
    await Promise.all(workers);

    const points = await prisma.googleLocalGridPoint.findMany({ where: { scanId } });
    const ranks = points.flatMap((point) => point.rank ? [point.rank] : []);
    const found = ranks.length;
    const total = points.length || 1;
    await prisma.googleLocalScan.update({
      where: { id: scanId },
      data: {
        status: found > 0 ? "COMPLETED" : "FAILED",
        averageRank: found ? ranks.reduce((sum, rank) => sum + rank, 0) / found : null,
        top3Percent: (ranks.filter((rank) => rank <= 3).length / total) * 100,
        top10Percent: (ranks.filter((rank) => rank <= 10).length / total) * 100,
        foundPercent: (found / total) * 100,
        completedAt: new Date(),
        error: found > 0 ? null : "O perfil não foi encontrado em nenhum ponto da grade.",
      },
    });
  } catch (error) {
    await prisma.googleLocalScan.update({
      where: { id: scanId },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : String(error),
        completedAt: new Date(),
      },
    }).catch(() => undefined);
  } finally {
    activeExecutions.delete(scanId);
  }
}

export async function resolveGoogleLocalAccess(
  prisma: PrismaClient,
  organizationId: string,
  userId: string,
  role?: string,
) {
  if (role === "SUPER_ADMIN") return { enabled: true, monthlyLimit: 100000, source: "SUPER_ADMIN" };

  const now = new Date();
  const [userGrant, orgGrant] = await Promise.all([
    prisma.googleLocalAccess.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    }),
    prisma.googleLocalAccess.findFirst({
      where: { organizationId, userId: null },
    }),
  ]);
  const grant = userGrant || orgGrant;
  const enabled = Boolean(grant?.enabled && (!grant.expiresAt || grant.expiresAt > now));
  return {
    enabled,
    monthlyLimit: grant?.monthlyLimit || 0,
    source: userGrant ? "USER" : orgGrant ? "ORGANIZATION" : "NONE",
    expiresAt: grant?.expiresAt || null,
  };
}
