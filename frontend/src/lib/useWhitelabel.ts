import { useEffect, useState } from "react";
import { isCustomWorkspaceHost } from "./workspaceRoute";

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only fetch if we are on a custom domain/host.
    // If it's the main host, we don't necessarily need to overwrite,
    // but if the system wants to apply whitelabel even on slugs, this logic can be adjusted.
    const fetchContext = async () => {
      try {
        const res = await fetch("/api/domain/context");
        if (res.ok) {
          const data = await res.json();
          if (data.organization?.whiteLabelConfig) {
            const wl = data.organization.whiteLabelConfig;
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
            if (wl.name) {
              document.title = wl.name;
            }
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

  return { config, loading };
}
