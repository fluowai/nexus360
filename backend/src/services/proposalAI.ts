import { runAiCoreChat } from "./aiCoreClient.js";

export const proposalAI = {
  generate: async (niche: string, clientName: string, services: string[], orgId: string, googleLocalDiagnosis?: string) => {
    const diagnosisContext = googleLocalDiagnosis 
      ? `\n\nDIAGNÓSTICO DO GOOGLE MEU NEGÓCIO DESTE CLIENTE (USE ISSO PARA CRIAR URGÊNCIA E MOSTRAR QUE ESTUDAMOS A EMPRESA):\n"${googleLocalDiagnosis}"\n` 
      : "";

    const prompt = `
      Você é um Consultor de Vendas Senior e Copywriter de Resposta Direta.
      Seu objetivo é gerar uma proposta comercial IRRECUSÁVEL para um cliente no nicho: "${niche}".
      Nome do Cliente: "${clientName}"
      Serviços Oferecidos: ${services.join(", ")}
      ${diagnosisContext}
      
      Retorne APENAS um JSON válido com esta estrutura:
      {
        "headline": "Título de impacto que foca no benefício principal",
        "subheadline": "Frase que reforça a autoridade ou urgência",
        "introduction": "Breve parágrafo conectando com a dor do cliente",
        "problem": "Descrição do problema que o cliente enfrenta hoje no nicho dele",
        "solution": "Como nossos serviços resolvem esse problema especificamente",
        "sections": [
          { "title": "Por que nós?", "content": "Texto sobre diferenciais" },
          { "title": "Metodologia", "content": "Como entregamos o resultado" }
        ],
        "benefits": ["Benefício 1", "Benefício 2", "Benefício 3"],
        "callToAction": "Chamada final para fechar o negócio"
      }

      REGRAS:
      1. Linguagem executiva, premium e persuasiva.
      2. Foco total em ROI (Retorno sobre Investimento).
      3. Use gatilhos mentais de autoridade e prova social.
    `;

    try {
      const result = await runAiCoreChat({
        system: "proposal-writer",
        clientId: orgId,
        agent: "proposal-writer",
        message: prompt,
        temperature: 0.6,
        maxTokens: 4096,
      });

      return JSON.parse(result.response || "{}");
    } catch (error) {
      console.error("[PROPOSAL_AI_ERROR]", error);
      throw new Error("Falha ao gerar proposta via IA.");
    }
  }
};
