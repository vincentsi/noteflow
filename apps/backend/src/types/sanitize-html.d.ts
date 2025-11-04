/**
 * Type declarations for sanitize-html
 * Fallback type definitions in case @types/sanitize-html is not found
 */
declare module 'sanitize-html' {
  interface IOptions {
    allowedTags?: string[] | false
    allowedAttributes?: { [key: string]: string[] } | false
    allowedSchemes?: string[]
    allowedSchemesByTag?: { [key: string]: string[] }
    allowedSchemesAppliedToAttributes?: string[]
    allowProtocolRelative?: boolean
    enforceHtmlBoundary?: boolean
  }

  function sanitizeHtml(dirty: string, options?: IOptions): string

  export = sanitizeHtml
}
