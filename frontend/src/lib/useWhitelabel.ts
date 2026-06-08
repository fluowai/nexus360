import { useEffect, useState } from "react";
import { publicApiFetch, readJsonResponse } from "./api";

const RESERVED_WORKSPACE_SLUGS = new Set([
  "admin",
  "api",
  "login",
  "onboarding",
  "site",
  "vendas",
  "meet",
  "p",
  "lp",
  "client-portal",
  "dashboard",
  "crm",
  "prospecting",
  "finance",
  "settings",
  "team",
  "projects",
  "reports",
  "clients",
  "sold-services",
  "ad-accounts",
  "assets",
  "landing-pages",
  "quiz",
  "content",
  "marketing",
  "sales-machine",
  "proposals",
  "agents-hub",
  "ai-settings",
  "prompt-architect",
  "billing",
  "automations",
  "notifications",
  "delivery",
  "service-catalog",
  "time-tracking",
  "knowledge-base",
  "client-health",
  "whatsapp",
  "acp",
]);

function getWorkspaceSlugFromPath() {
  const slug = window.location.pathname.split("/").filter(Boolean)[0]?.toLowerCase() || "";
  if (!/^[a-z0-9][a-z0-9-]{0,62}$/.test(slug)) return "";
  if (RESERVED_WORKSPACE_SLUGS.has(slug)) return "";
  return slug;
}

export interface WhitelabelConfig {
  name?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  [key: string]: any;
}

export function useWhitelabel() {
  const [config, setConfig] = useState<WhitelabelConfig | null>(null);
  const [customDomain, setCustomDomain] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch if we are on a custom domain/host.
    // If it's the main host, we don't necessarily need to overwrite,
    // but if the system wants to apply whitelabel even on slugs, this logic can be adjusted.
    const fetchContext = async () => {
      try {
        const slug = getWorkspaceSlugFromPath();
        const path = slug ? `/api/domain/context?slug=${encodeURIComponent(slug)}` : "/api/domain/context";
        const res = await publicApiFetch(path);
        if (res.ok) {
          const data = await readJsonResponse(res, "Contexto white label indisponivel.");
          setCustomDomain(Boolean(data.customDomain));

          if (data.organization) {
            if (data.organization.slug) {
              localStorage.setItem("nexus_org_slug", data.organization.slug);
            }

            const wl = {
              name: data.organization.whiteLabelConfig?.name || data.organization.name,
              ...(data.organization.whiteLabelConfig || {}),
            };
            setConfig(wl);

            if (wl.primaryColor) {
              document.documentElement.style.setProperty("--nexus-primary", wl.primaryColor);
              // Set hover state automatically (lighten or darken slightly, simplistic approach)
              document.documentElement.style.setProperty("--nexus-primary-hover", wl.primaryColor);
            }
            if (wl.secondaryColor) {
              document.documentElement.style.setProperty("--nexus-nav-dark", wl.secondaryColor);
              document.documentElement.style.setProperty("--nexus-nav-dark-2", wl.secondaryColor);
            }
            if (wl.faviconUrl) {
              const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
              link.type = 'image/x-icon';
              link.rel = 'shortcut icon';
              link.href = wl.faviconUrl;
              document.getElementsByTagName('head')[0].appendChild(link);
            }
            document.title = wl.name || "Nexus360";
          }
        }
      } catch (err) {
        console.error("Failed to load whitelabel context", err);
      } finally {
        setLoading(false);
      }
    };

    fetchContext();
  }, []);

  return { config, customDomain, loading };
}
