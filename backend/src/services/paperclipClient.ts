type PaperclipClientOptions = {
  baseUrl: string;
  apiToken: string;
  timeoutMs?: number;
};

type PaperclipRequestOptions = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | null | undefined>;
  timeoutMs?: number;
};

export function normalizePaperclipBaseUrl(value: string) {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return trimmed.endsWith("/api") ? trimmed.slice(0, -4) : trimmed;
}

function buildApiUrl(baseUrl: string, path: string, query?: PaperclipRequestOptions["query"]) {
  const normalizedBase = normalizePaperclipBaseUrl(baseUrl);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${normalizedBase}/api${normalizedPath}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parsePaperclipResponse(response: Response) {
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { raw: text } : null;
}

export class PaperclipApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "PaperclipApiError";
    this.status = status;
    this.details = details;
  }
}

export class PaperclipClient {
  private readonly baseUrl: string;
  private readonly apiToken: string;
  private readonly timeoutMs: number;

  constructor(options: PaperclipClientOptions) {
    this.baseUrl = normalizePaperclipBaseUrl(options.baseUrl);
    this.apiToken = String(options.apiToken || "").trim();
    this.timeoutMs = options.timeoutMs || 20000;
  }

  private async request<T = any>(path: string, options: PaperclipRequestOptions = {}): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || this.timeoutMs);

    try {
      const response = await fetch(buildApiUrl(this.baseUrl, path, options.query), {
        method: options.method || "GET",
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          ...(options.body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      const payload = await parsePaperclipResponse(response);
      if (!response.ok) {
        const message = typeof payload === "object" && payload && "error" in payload
          ? String((payload as any).error)
          : `Paperclip request failed with status ${response.status}`;
        throw new PaperclipApiError(message, response.status, payload);
      }

      return payload as T;
    } catch (error: any) {
      if (error?.name === "AbortError") {
        throw new Error("Tempo limite excedido ao conectar com o Paperclip.");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  health() {
    return this.request("/health");
  }

  getCompany(companyId: string) {
    return this.request(`/companies/${companyId}`);
  }

  createCompany(payload: {
    name: string;
    description?: string | null;
    budgetMonthlyCents?: number;
  }) {
    return this.request("/companies", {
      method: "POST",
      body: payload,
    });
  }

  updateCompany(companyId: string, payload: {
    name?: string;
    description?: string | null;
    budgetMonthlyCents?: number;
    status?: string;
    brandColor?: string;
  }) {
    return this.request(`/companies/${companyId}`, {
      method: "PATCH",
      body: payload,
    });
  }

  listAgents(companyId: string) {
    return this.request(`/companies/${companyId}/agents`);
  }

  getAgent(agentId: string, companyId?: string) {
    return this.request(`/agents/${agentId}`, {
      query: companyId ? { companyId } : undefined,
    });
  }

  createAgent(companyId: string, payload: Record<string, unknown>) {
    return this.request(`/companies/${companyId}/agents`, {
      method: "POST",
      body: payload,
    });
  }

  wakeupAgent(agentId: string, payload: Record<string, unknown>) {
    return this.request(`/agents/${agentId}/wakeup`, {
      method: "POST",
      body: payload,
    });
  }

  syncAgentSkills(agentId: string, desiredSkills: string[]) {
    return this.request(`/agents/${agentId}/skills/sync`, {
      method: "POST",
      body: { desiredSkills },
    });
  }
}

export function createPaperclipClient(options: PaperclipClientOptions) {
  return new PaperclipClient(options);
}
