import OpenAI from 'openai'
import { SummaryStyle } from '@prisma/client'
import { extractText } from 'unpdf'
import axios from 'axios'
import { env } from '@/config/env'

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
      apiKey: env.OPENAI_API_KEY,
    })
  }

  async generateTitle(text: string, language: 'fr' | 'en'): Promise<string> {
    const prompt =
      language === 'fr'
        ? 'Génère un titre court et accrocheur (maximum 60 caractères) pour ce texte. Réponds uniquement avec le titre, sans guillemets ni ponctuation finale.'
        : 'Generate a short and catchy title (maximum 60 characters) for this text. Reply only with the title, without quotes or final punctuation.'

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: prompt,
        },
        {
          role: 'user',
          content: text.substring(0, 1000), // Limit to first 1000 chars for title generation
        },
      ],
      temperature: 0.7,
      max_tokens: 50,
    })

    return response.choices[0]?.message?.content?.trim() || 'Sans titre'
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

  async generateCoverImage(title: string): Promise<string | null> {
    try {
      // Extract keywords from title for image search
      const keywords = title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(' ')
        .filter(word => word.length > 3)
        .slice(0, 3)
        .join(',')

      // Use Unsplash API (gratuit avec limite de 50 requêtes/heure)
      const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY

      if (!unsplashAccessKey) {
        // Fallback: return Picsum Photos placeholder (800x400, random image based on seed)
        const seed = Math.floor(Math.random() * 1000)
        return `https://picsum.photos/seed/${seed}/800/400`
      }

      const response = await axios.get('https://api.unsplash.com/photos/random', {
        params: {
          query: keywords || 'abstract',
          orientation: 'landscape',
          content_filter: 'high',
        },
        headers: {
          Authorization: `Client-ID ${unsplashAccessKey}`,
        },
        timeout: 5000,
      })

      return response.data?.urls?.regular || null
    } catch {
      // Fallback to Picsum Photos
      const seed = Math.floor(Math.random() * 1000)
      return `https://picsum.photos/seed/${seed}/800/400`
    }
  }

  async extractTextFromPDF(buffer: Buffer): Promise<string> {
    try {
      const uint8Array = new Uint8Array(buffer)
      const { text } = await extractText(uint8Array)
      return text.join('\n')
    } catch (error) {
      throw new Error(
        `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}

// Export singleton instance
export const aiService = new AIService()
