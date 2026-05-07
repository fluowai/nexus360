import { LeadProvider } from "./lead-provider.interface.js";
import { SerpApiLeadProvider } from "./serpapi.provider.js";
import { OutscraperLeadProvider } from "./outscraper.provider.js";

export function getLeadProvider(provider: string): LeadProvider {
  switch (provider) {
    case 'serpapi':
      return new SerpApiLeadProvider();
    case 'outscraper':
      return new OutscraperLeadProvider();
    default:
      throw new Error(`Provider não suportado: ${provider}`);
  }
}
