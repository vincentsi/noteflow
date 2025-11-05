import OpenAI from 'openai'
import { SummaryStyle } from '@prisma/client'
import { extractText } from 'unpdf'
import axios from 'axios'
import { env } from '@/config/env'
import { readFile } from 'node:fs/promises'

const PROMPTS = {
  [SummaryStyle.SHORT]: {
    fr: 'Résume ce texte en 2 à 3 phrases claires, simples et informatives, sans omettre les idées essentielles.',
    en: 'Summarize this text in 2–3 clear, simple, and informative sentences that retain the core ideas.',
  },
  [SummaryStyle.TWEET]: {
    fr: 'Résume ce texte en un tweet percutant (max. 280 caractères) avec un ton clair, engageant et facile à lire.',
    en: 'Summarize this text in a punchy tweet (max. 280 characters) with a clear, engaging, and readable tone.',
  },
  [SummaryStyle.THREAD]: {
    fr: 'Crée un thread Twitter (5 à 7 tweets numérotés) présentant les points clés du texte de manière fluide et captivante.',
    en: 'Create a Twitter thread (5–7 numbered tweets) presenting the key points clearly, smoothly, and engagingly.',
  },
  [SummaryStyle.BULLET_POINT]: {
    fr: 'Dresse une liste de 5 à 8 points clés du texte sous forme de puces (•), chaque point étant concis, clair et informatif.',
    en: 'List 5–8 key points from the text as bullet points (•), each one concise, clear, and informative.',
  },
  [SummaryStyle.TOP3]: {
    fr: 'Identifie et numérote les 3 idées les plus importantes du texte (1, 2, 3), formulées de manière claire et directe.',
    en: 'Identify and number the 3 most important ideas from the text (1, 2, 3), stated clearly and directly.',
  },
  [SummaryStyle.MAIN_POINTS]: {
    fr: 'Rédige un résumé détaillé et structuré du texte, en distinguant les idées principales, les arguments et les exemples clés.',
    en: 'Write a detailed and structured summary of the text, distinguishing main ideas, arguments, and key examples.',
  },
  [SummaryStyle.EDUCATIONAL]: {
    fr: 'Explique ce texte comme à un élève débutant, en simplifiant les termes complexes et en illustrant les idées clés.',
    en: 'Explain this text as if to a beginner, simplifying complex terms and illustrating the key ideas clearly.',
  },
} as const

export class AIService {
  private openai: OpenAI

  constructor() {
    this.openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      timeout: 30000, // 30 second timeout for all OpenAI requests
      maxRetries: 2, // Retry failed requests up to 2 times
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

  async generateSummary(text: string, style: SummaryStyle, language: 'fr' | 'en'): Promise<string> {
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
      const unsplashAccessKey = env.UNSPLASH_ACCESS_KEY

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

  async extractTextFromPDFFile(filePath: string): Promise<string> {
    try {
      const buffer = await readFile(filePath)
      const uint8Array = new Uint8Array(buffer)
      const { text } = await extractText(uint8Array)
      return text.join('\n')
    } catch (error) {
      throw new Error(
        `Failed to extract text from PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }
}

// Export singleton instance
export const aiService = new AIService()
