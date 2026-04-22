import puppeteer from 'puppeteer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

interface PostData {
  tipo: 'carrossel' | 'post';
  titulo: string;
  conteudos: string[];
  cores: {
    fundo: string;
    primaria: string;
    texto: string;
  };
}

/**
 * Função auxiliar que gera o HTML do slide para o Puppeteer renderizar
 */
const getSlideTemplate = (title: string, content: string, colors: PostData['cores'], slideIndex: number, totalSlides: number) => {
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
      <style>
        * { margin: 0; padding: 0; box-box: border-box; }
        body {
          width: 1080px;
          height: 1080px;
          background-color: ${colors.fundo};
          font-family: 'Inter', sans-serif;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 80px;
          color: ${colors.texto};
          position: relative;
          overflow: hidden;
        }
        
        /* Background decorative element */
        .decoration {
          position: absolute;
          width: 600px;
          height: 600px;
          background: linear-gradient(135deg, ${colors.primaria}22 0%, transparent 100%);
          border-radius: 50%;
          top: -200px;
          right: -200px;
          z-index: 0;
        }

        .header {
          position: absolute;
          top: 60px;
          left: 80px;
          display: flex;
          align-items: center;
          gap: 12px;
          z-index: 2;
        }
        .logo-box {
          width: 40px;
          height: 40px;
          background-color: ${colors.primaria};
          border-radius: 8px;
        }
        .brand-name {
          font-weight: 700;
          font-size: 24px;
          color: ${colors.texto};
          letter-spacing: -0.5px;
        }

        .main-container {
          z-index: 1;
          width: 100%;
        }

        h1 {
          font-size: 72px;
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 40px;
          letter-spacing: -2px;
          color: ${colors.texto};
        }

        .content {
          font-size: 36px;
          line-height: 1.5;
          opacity: 0.9;
          font-weight: 400;
          max-width: 800px;
        }

        .footer {
          position: absolute;
          bottom: 60px;
          left: 80px;
          right: 80px;
          display: flex;
          justify-content: justify;
          align-items: center;
          z-index: 2;
        }

        .slide-indicator {
          font-weight: 700;
          font-size: 20px;
          color: ${colors.texto}88;
          background: #00000008;
          padding: 8px 16px;
          border-radius: 20px;
        }

        .cta {
          font-weight: 700;
          font-size: 20px;
          color: ${colors.primaria};
        }
      </style>
    </head>
    <body>
      <div className="decoration"></div>
      
      <div className="header">
        <div className="logo-box"></div>
        <div className="brand-name">NEXUS360</div>
      </div>

      <div className="main-container">
        <h1>${title.toUpperCase()}</h1>
        <div className="content">${content}</div>
      </div>

      <div className="footer">
        <div className="cta">nexus360.ai</div>
        ${totalSlides > 1 ? `<div className="slide-indicator">${slideIndex}/${totalSlides}</div>` : ''}
      </div>
    </body>
    </html>
  `;
};

/**
 * Função principal para gerar as artes do Instagram
 */
export async function generateInstagramPost(data: PostData): Promise<string[]> {
  const outputDir = path.join(process.cwd(), 'outputs');
  
  // Garante que a pasta output existe
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1080, deviceScaleFactor: 2 });

  const paths: string[] = [];
  const slides = data.tipo === 'post' ? [data.titulo] : [data.titulo, ...data.conteudos];
  const totalSlides = slides.length;

  try {
    for (let i = 0; i < totalSlides; i++) {
        const isFirstSlide = i === 0;
        const currentTitle = isFirstSlide ? data.titulo : "CONTINUANDO...";
        const currentContent = isFirstSlide && data.tipo === 'post' ? '' : slides[i];
        
        const html = getSlideTemplate(
          currentTitle, 
          currentContent, 
          data.cores, 
          i + 1, 
          totalSlides
        );

        await page.setContent(html, { waitUntil: 'networkidle0' });

        const tempFileName = `temp_slide_${i}.png`;
        const tempPath = path.join(outputDir, tempFileName);
        const finalFileName = `instagram_slide_${Date.now()}_${i}.png`;
        const finalPath = path.join(outputDir, finalFileName);

        // Screenshot inicial com Puppeteer
        await page.screenshot({ path: tempPath });

        // Otimização com Sharp
        await sharp(tempPath)
          .png({ quality: 90, compressionLevel: 9 })
          .toFile(finalPath);

        // Remove o arquivo temporário
        fs.unlinkSync(tempPath);

        paths.push(path.join('outputs', finalFileName));
    }
  } finally {
    await browser.close();
  }

  return paths;
}

/**
 * EXEMPLO DE USO
 * 
 * const result = await generateInstagramPost({
 *   tipo: "carrossel",
 *   titulo: "5 dicas para vender mais com IA",
 *   conteudos: [
 *     "Identifique seu público alvo com algoritmos",
 *     "Crie conteúdo personalizado em segundos",
 *     "Automatize seu atendimento no checkout",
 *     "Analise dados para prever tendências",
 *     "Otimize seus anúncios em tempo real"
 *   ],
 *   cores: {
 *     fundo: "#FFFFFF",
 *     primaria: "#3B82F6",
 *     texto: "#1F2937"
 *   }
 * });
 * 
 * console.log(result);
 */
