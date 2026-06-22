import { Groq } from "groq-sdk";

export const proposalAI = {
  generate: async (niche: string, clientName: string, services: string[], apiKey: string, googleLocalDiagnosis?: string) => {
    const groq = new Groq({ apiKey });

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
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3-70b-8192",
        response_format: { type: "json_object" },
        temperature: 0.6
      });

      return JSON.parse(completion.choices[0].message.content || "{}");
    } catch (error) {
      console.error("[PROPOSAL_AI_ERROR]", error);
      throw new Error("Falha ao gerar proposta via IA.");
    }
  }
};
