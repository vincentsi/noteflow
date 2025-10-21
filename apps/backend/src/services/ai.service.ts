import OpenAI from 'openai'
import { SummaryStyle } from '@prisma/client'

type PDFData = {
  text: string
  numpages: number
  info: Record<string, unknown>
}

type PDFParseFunction = (buffer: Buffer) => Promise<PDFData>

// Dynamic import workaround for CommonJS pdf-parse
const loadPdfParse = async (): Promise<PDFParseFunction> => {
  const module = await import('pdf-parse')
  return module.default as unknown as PDFParseFunction
}

const PROMPTS = {
  [SummaryStyle.SHORT]: {
    fr: 'Résume ce texte en 2-3 phrases courtes et claires.',
    en: 'Summarize this text in 2-3 short and clear sentences.',
  },
  [SummaryStyle.TWEET]: {
    fr: 'Résume ce texte en un tweet de maximum 280 caractères.',
    en: 'Summarize this text in a tweet of maximum 280 characters.',
  },
  [SummaryStyle.THREAD]: {
    fr: 'Crée un thread Twitter (5-7 tweets numérotés) résumant les points clés de ce texte.',
    en: 'Create a Twitter thread (5-7 numbered tweets) summarizing the key points of this text.',
  },
  [SummaryStyle.BULLET_POINT]: {
    fr: 'Liste les points clés de ce texte sous forme de bullet points (5-8 points avec •).',
    en: 'List the key points of this text as bullet points (5-8 points with •).',
  },
  [SummaryStyle.TOP3]: {
    fr: 'Extrais les 3 points les plus importants de ce texte (numérotés 1, 2, 3).',
    en: 'Extract the 3 most important points from this text (numbered 1, 2, 3).',
  },
  [SummaryStyle.MAIN_POINTS]: {
    fr: 'Résume les points principaux de ce texte de manière détaillée et structurée.',
    en: 'Summarize the main points of this text in a detailed and structured way.',
  },
} as const

export class AIService {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }

  async generateSummary(
    text: string,
    style: SummaryStyle,
    language: 'fr' | 'en'
  ): Promise<string> {
    const systemPrompt = PROMPTS[style][language]

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.7,
      max_tokens: style === SummaryStyle.TWEET ? 100 : 1000,
    })

    return response.choices[0]?.message?.content || ''
  }

  async extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
      const parse = await loadPdfParse()
      const data = await parse(buffer)
      return data.text
    } catch (error) {
      throw new Error(
        `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}
