import { Groq } from "groq-sdk";

export const creativeAI = {
  generateScript: async (theme: string, type: 'carousel' | 'single', apiKey: string) => {
    const groq = new Groq({ apiKey });

    const prompt = `
      Você é o codinome "Mano", o Diretor de Criação e Copywriter mais bem pago do mercado jurídico e de infoprodutos.
      Seu objetivo é criar um carrossel de 5 a 7 slides (ou um post único de impacto) sobre: "${theme}".

      ESTILO DE ESCRITA:
      - Estilo ChatGPT: Texto fluido, inteligente, que educa e vende ao mesmo tempo.
      - Nada de clichês. Use analogias poderosas.
      - Cada slide deve ter uma copy robusta, não apenas uma frase curta.

      ESTRUTURA JSON EXATA (RETORNE APENAS O JSON):
      {
        "slides": [
          { 
            "headline": "Título chamativo", 
            "copy": "Texto longo e persuasivo para o corpo do slide (mínimo 30 palavras)", 
            "cta": "O que o usuário deve fazer",
            "visualConcept": "Descrição em português para o designer do que deve ter na imagem",
            "imagePrompt": "Prompt em inglês para gerador de imagem (DALL-E/Midjourney style)"
          }
        ],
        "overallStrategy": "Breve explicação do porquê esse carrossel vai converter"
      }

      FOCO: Alta conversão, autoridade e elegância.
    `;

    try {
      const completion = await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3-70b-8192",
        response_format: { type: "json_object" },
        temperature: 0.8 // Mais criatividade
      });

      return JSON.parse(completion.choices[0].message.content || "{}");
    } catch (error) {
      console.error("[CREATIVE_AI_ERROR]", error);
      throw new Error("Erro na geração criativa.");
    }
  }
};
