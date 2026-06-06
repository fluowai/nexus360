import axios from "axios";
import * as cheerio from "cheerio";

export interface ScanInput {
  companyName: string;
  website?: string | null;
  instagram?: string | null;
  cnpj?: string | null;
  segment?: string | null;
}

export interface ScanResult {
  companyName: string;
  website: string | null;
  instagram: string | null;
  cnpj: string | null;
  segment: string | null;
  googleResults: Array<{ title: string; url: string; snippet: string }>;
  websiteContent: string | null;
  instagramInfo: string | null;
  productsServices: string[];
  socialProfiles: string[];
  newsMentions: string[];
  dossier: string;
  rawData: {
    serperResponse: any;
    jinaContent: string | null;
    websiteHtml?: string;
  };
}

async function searchGoogle(serperKey: string, query: string) {
  const { data } = await axios.post(
    "https://google.serper.dev/search",
    { q: query, num: 10 },
    { headers: { "X-API-KEY": serperKey } }
  );
  return data;
}

async function fetchViaJina(url: string): Promise<string | null> {
  try {
    const { data } = await axios.get(`https://r.jina.ai/http://${url.replace(/^https?:\/\//, "")}`, {
      headers: {
        "X-Return-Format": "markdown",
        "User-Agent": "Mozilla/5.0 (compatible; Nexus360Scanner/1.0)"
      },
      timeout: 20000,
    });
    return typeof data === "string" ? data.slice(0, 15000) : null;
  } catch {
    return null;
  }
}

async function fetchViaCheerio(url: string): Promise<{ text: string; products: string[] }> {
  try {
    const fullUrl = url.startsWith("http") ? url : `https://${url}`;
    const { data: html } = await axios.get(fullUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      timeout: 15000,
    });
    const $ = cheerio.load(html);
    $("script, style, nav, footer, header, iframe").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, 10000);

    const productKeywords = ["produto", "serviço", "solução", "catalogo", "produtos", "servicos", "solucoes", "planos", "preços", "precos", "comprar"];
    const products: string[] = [];
    productKeywords.forEach(kw => {
      $(`a[href*="${kw}"], h2, h3, h4, li, p`).each((_, el) => {
        const t = $(el).text().trim();
        if (t.toLowerCase().includes(kw) && t.length < 200) products.push(t);
      });
    });

    return { text, products: [...new Set(products)] };
  } catch {
    return { text: "", products: [] };
  }
}

export async function scanClient(input: ScanInput, serperKey: string, groqKey?: string): Promise<ScanResult> {
  const { companyName, website, instagram, cnpj, segment } = input;

  const googleQuery = `${companyName} ${segment || ""} ${cnpj ? `CNPJ ${cnpj}` : ""}`.trim();

  const [serperResponse, jinaContent, cheerioResult] = await Promise.all([
    searchGoogle(serperKey, googleQuery).catch(() => null),
    website ? fetchViaJina(website) : Promise.resolve(null),
    website ? fetchViaCheerio(website) : Promise.resolve({ text: "", products: [] }),
  ]);

  const googleResults: Array<{ title: string; url: string; snippet: string }> =
    serperResponse?.organic?.map((r: any) => ({
      title: r.title,
      url: r.link,
      snippet: r.snippet,
    })) || [];

  const socialProfiles = googleResults
    .filter(r => /instagram\.com|facebook\.com|linkedin\.com|youtube\.com/.test(r.url))
    .map(r => r.url);

  const newsMentions = (serperResponse?.news || [])
    .map((r: any) => `${r.title}: ${r.link}`);

  const productsServices = [
    ...(cheerioResult.products || []),
    ...extractProductsFromText(jinaContent || cheerioResult.text || ""),
  ];

  const websiteContent = jinaContent || cheerioResult.text || null;

  const groqPrompt = `Com base nos dados abaixo sobre a empresa "${companyName}", gere um dossiê executivo com:

1. **Resumo da empresa** (atuação, porte aparente, segmento)
2. **Presença digital** (site, redes sociais encontradas, qualidade)
3. **Produtos/Serviços identificados** (liste tudo que parece ser vendido)
4. **Concorrência e mercado** (menções de concorrentes, notícias)
5. **Sinais de maturidade digital** (baixa/média/alta)
6. **Oportunidades comerciais** (gaps que identificou)
7. **Recomendações iniciais** (3 ações prioritárias)

Seja direto e analítico. Use apenas os dados fornecidos, não invente.

Dados da empresa:
- Nome: ${companyName}
- Website: ${website || "N/A"}
- Instagram: ${instagram || "N/A"}
- CNPJ: ${cnpj || "N/A"}
- Segmento: ${segment || "N/A"}

Resultados do Google (${googleResults.length} encontrados):
${googleResults.slice(0, 8).map(r => `- ${r.title}: ${r.snippet} (${r.url})`).join("\n")}

Notícias:
${newsMentions.slice(0, 5).join("\n") || "Nenhuma encontrada"}

Conteúdo do site:
${(websiteContent || "Não foi possível acessar o site").slice(0, 5000)}

Produtos/Serviços identificados:
${productsServices.slice(0, 20).join("\n") || "Não foi possível identificar produtos específicos."}`;

  let dossier = "";
  try {
    const groqResp = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "Você é um analista de inteligência de mercado. Gere dossiês executivos concisos e acionáveis." },
          { role: "user", content: groqPrompt }
        ],
        temperature: 0.4,
        max_tokens: 4096,
      },
      { headers: { Authorization: `Bearer ${groqKey || process.env.GROQ_API_KEY}` } }
    );
    dossier = groqResp.data.choices?.[0]?.message?.content || "Dossiê não gerado.";
  } catch {
    dossier = "Falha ao gerar dossiê com IA. Verifique a chave GROQ.";
  }

  const instagramInfo = instagram
    ? `Perfil informado: ${instagram}. Para análise detalhada do Instagram, é necessário configurar integração com API do Meta ou fornecer acesso manual.`
    : null;

  return {
    companyName,
    website: website || null,
    instagram: instagram || null,
    cnpj: cnpj || null,
    segment: segment || null,
    googleResults,
    websiteContent,
    instagramInfo,
    productsServices: [...new Set(productsServices)],
    socialProfiles: [...new Set(socialProfiles)],
    newsMentions,
    dossier,
    rawData: {
      serperResponse,
      jinaContent,
      websiteHtml: cheerioResult.text,
    },
  };
}

function extractProductsFromText(text: string): string[] {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const keywords = ["produto", "serviço", "solução", "plano", "preço", "comprar", "catálogo", "catalogo", "pacote", "kit", "curso", "consultoria", "assinatura", "mensalidade"];
  const found: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (keywords.some(k => lower.includes(k)) && lines[i].length < 200) {
      found.push(lines[i]);
    }
  }
  return found;
}
