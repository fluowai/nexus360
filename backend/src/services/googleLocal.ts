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
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Scraper HTTP ${response.status}: ${details.slice(0, 500)}`);
  }

  return response;
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
      max_time: 180000000000,
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
