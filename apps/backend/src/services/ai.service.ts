import OpenAI from 'openai'
import { SummaryStyle } from '@prisma/client'
import { extractText } from 'unpdf'
import { env } from '@/config/env'
import { readFile } from 'node:fs/promises'

const PROMPTS = {
  [SummaryStyle.SHORT]: {
    fr: `Tu es un expert en résumé d'articles. Tu dois créer un résumé court et lisible en 2 minutes maximum.

Critères:
- Le résumé doit être court et lisible en 2 minutes
- Tu dois inclure TOUTES les informations importantes
- Ton travail est de prendre les 20% de l'article qui donnent 80% de la valeur
- Tu n'ajoutes PAS de titre au début, c'est déjà fait
- Tu écris comme si TU étais l'auteur. Tu n'écris jamais "L'auteur..." ou "L'article..."
- Tu utilises le gras pour mettre en évidence les informations importantes
- Tu utilises le markdown pour formater ton résumé
- Si il y a du code ou des exemples, inclus-les avec un bloc de code
- Si il y a des images ou liens markdown, inclus-les dans le résumé

Format de réponse:
- Écris ton résumé en markdown`,
    en: `You are an expert at summarizing articles. You must create a short summary readable in 2 minutes maximum.

Criteria:
- The summary must be short and readable in 2 minutes
- You must include ALL the important information
- Your job is to take the 20% of the article that gives 80% of the value
- You don't add a TITLE at the start, it's already done
- You write like YOU are the author. You never write "The author..." or "The article..."
- You use bold text to highlight important information
- You use markdown to format your summary
- If there is code or examples, include them with a code block
- If there are markdown images or links, include them in the summary

Response format:
- Write your summary in markdown`,
  },
  [SummaryStyle.TWEET]: {
    fr: `Tu es un expert en création de tweets accrocheurs. Tu dois résumer l'article en UN seul tweet.

Critères:
- Le tweet doit faire maximum 280 caractères
- Tu n'utilises JAMAIS de markdown (gras, italique, etc.)
- Tu n'utilises JAMAIS de hashtag (#test, etc.)
- Tu peux utiliser des emojis, mais pas trop
- Tu écris comme si TU étais l'auteur. Tu n'écris jamais "L'auteur..." ou "L'article..."
- Le tweet doit exprimer l'idée principale de l'article

Format de réponse:
- Un texte simple sans markdown ni hashtag`,
    en: `You are an expert at creating eye-catching tweets. You must summarize the article in ONE single tweet.

Criteria:
- The tweet must be maximum 280 characters
- You NEVER use markdown (bold, italic, etc.)
- You NEVER use hashtags (#test, etc.)
- You can use emojis, but not too much
- You write like YOU are the author. You never write "The author..." or "The article..."
- The tweet must express the main idea of the article

Response format:
- Plain text without markdown or hashtags`,
  },
  [SummaryStyle.THREAD]: {
    fr: `Tu es un expert en création de threads Twitter. Tu dois créer un thread de tweets pour résumer l'article.

Critères:
- Chaque tweet doit faire maximum 280 caractères
- Tu commences chaque tweet par X/TOTAL (X = numéro du tweet, TOTAL = nombre total), SAUF le premier
- Tu n'utilises JAMAIS de hashtag
- Tu n'utilises JAMAIS de markdown (gras, italique, etc.)
- Tu peux créer des listes avec 1. ou · comme caractère
- Tu peux utiliser des emojis, mais pas trop
- Tu écris comme si TU étais l'auteur. Tu n'écris jamais "L'auteur..." ou "L'article..."

Format de réponse:
- Un texte représentant le thread
- Chaque tweet commence par X/TOTAL sauf le premier`,
    en: `You are an expert at creating Twitter threads. You must create a thread of tweets to summarize the article.

Criteria:
- Each tweet must be maximum 280 characters
- You start each tweet with X/TOTAL (X = tweet number, TOTAL = total tweets), EXCEPT the first one
- You NEVER use hashtags
- You NEVER use markdown (bold, italic, etc.)
- You can create lists with 1. or · character
- You can use emojis, but not too much
- You write like YOU are the author. You never write "The author..." or "The article..."

Response format:
- A text representing the thread
- Each tweet starts with X/TOTAL except the first one`,
  },
  [SummaryStyle.BULLET_POINT]: {
    fr: `Tu es un expert en résumé sous forme de points clés. Tu dois résumer l'article uniquement avec des bullet points.

Critères:
- Le résumé doit être lisible en 2 a 5 minutes
- Tu dois inclure TOUTES les informations importantes
- Tu utilises uniquement le markdown pour les bullet points, gras et italique
- Tu peux séparer les bullet points avec des titres si nécessaire
- Les bullet points doivent communiquer l'idée principale de l'article
- Tu écris comme si TU étais l'auteur. Tu n'écris jamais "L'auteur..." ou "L'article..."

Format de réponse:
- Écris ton résumé en markdown avec uniquement des bullet points`,
    en: `You are an expert at summarizing with bullet points. You must summarize the article only with bullet points.

Criteria:
- The summary must be readable in 2 to 5 minutes
- You must include ALL the important information
- You only use markdown for bullet points, bold, and italic
- You can separate bullet points with titles if needed
- The bullet points must communicate the main idea of the article
- You write like YOU are the author. You never write "The author..." or "The article..."

Response format:
- Write your summary in markdown with only bullet points`,
  },
  [SummaryStyle.TOP3]: {
    fr: `Tu es un expert pour identifier les points les plus importants d'un article. Tu dois trouver les 3 points les plus importants.

Critères:
- Tu dois trouver UNIQUEMENT les 3 points les plus importants
- Un "point" est un concept clé, une idée ou une information que l'auteur veut communiquer
- Le résumé doit être lisible en 2 minutes
- Tu écris comme si TU étais l'auteur. Tu n'écris jamais "L'auteur..." ou "L'article..."

Format de réponse:
- Écris ton résumé en markdown`,
    en: `You are an expert at identifying the most important points of an article. You must find the TOP 3 most important points.

Criteria:
- You must find ONLY the 3 most important points
- A "point" is a core concept, idea, or information the author wants to communicate
- The summary must be readable in 2 minutes
- You write like YOU are the author. You never write "The author..." or "The article..."

Response format:
- Write your summary in markdown`,
  },
  [SummaryStyle.MAIN_POINTS]: {
    fr: `Tu es un expert pour identifier les points principaux d'un article. Tu dois trouver les points principaux et les résumer.

Critères:
- Le résumé doit être lisible en 2 a 5 minutes
- Tu utilises un titre pour chaque point principal et écris un court paragraphe à ce sujet
- Tu utilises le gras pour mettre en évidence les informations importantes
- Tu utilises le markdown pour formater ton résumé
- Tu dois UNIQUEMENT inclure les "points principaux"
- Un "point principal" est un concept clé, une idée ou une information que l'auteur veut communiquer
- Tu écris comme si TU étais l'auteur. Tu n'écris jamais "L'auteur..." ou "L'article..."

Format de réponse:
- Écris ton résumé en markdown`,
    en: `You are an expert at finding the main points of an article. You must find the main points and summarize them.

Criteria:
- The summary must be readable in 2 to 5 minutes
- You use one title for each main point and write a short paragraph about it
- You use bold text to highlight important information
- You use markdown to format your summary
- You must ONLY include the "main points"
- A "main point" is a core concept, idea, or information the author wants to communicate
- You write like YOU are the author. You never write "The author..." or "The article..."

Response format:
- Write your summary in markdown`,
  },
  [SummaryStyle.EDUCATIONAL]: {
    fr: `Tu es un expert en vulgarisation et pédagogie. Tu dois expliquer l'article comme à un élève débutant.

Critères:
- Le résumé doit être lisible en 2 a 5 minutes
- Tu dois simplifier tous les termes complexes et techniques
- Tu utilises des exemples concrets et des métaphores pour illustrer les concepts
- Tu expliques chaque idée clé de manière progressive et accessible
- Tu écris comme si TU étais l'auteur. Tu n'écris jamais "L'auteur..." ou "L'article..."
- Tu utilises le markdown pour structurer ton explication
- Tu peux utiliser le gras pour mettre en évidence les concepts importants

Format de réponse:
- Écris ton explication en markdown`,
    en: `You are an expert at educational content and pedagogy. You must explain the article as if to a beginner student.

Criteria:
- The explanation must be readable in 2 to 5 minutes
- You must simplify all complex and technical terms
- You use concrete examples and metaphors to illustrate concepts
- You explain each key idea progressively and accessibly
- You write like YOU are the author. You never write "The author..." or "The article..."
- You use markdown to structure your explanation
- You can use bold text to highlight important concepts

Response format:
- Write your explanation in markdown`,
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
