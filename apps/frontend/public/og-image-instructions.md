# Open Graph Image Instructions

Pour créer l'image OG optimale pour le SEO et les réseaux sociaux :

## Spécifications techniques
- **Dimensions** : 1200x630 pixels (format recommandé par Facebook/LinkedIn/Twitter)
- **Format** : PNG ou JPG
- **Poids** : < 1 MB
- **Nom** : og-image.png

## Contenu recommandé
1. **Logo/Brand** : "NotePostFlow" en gros (police moderne)
2. **Tagline** : "Veille IA • Résumés AI • Notes"
3. **Icônes** : RSS feed icon, AI sparkle, Markdown icon
4. **Couleurs** : Fond sombre avec accents bleus/violets (thème tech)
5. **Call-to-action** : "Gagnez du temps avec l'IA"

## Outils pour créer l'image
- **Canva** : Template "Open Graph" (gratuit)
- **Figma** : Design custom
- **Vercel OG** : Génération dynamique (code ci-dessous)

## Alternative : Génération dynamique avec Vercel OG

Créer `apps/frontend/app/api/og/route.tsx` :

```typescript
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          backgroundImage: 'radial-gradient(circle at 25px 25px, #333 2%, transparent 0%), radial-gradient(circle at 75px 75px, #333 2%, transparent 0%)',
          backgroundSize: '100px 100px',
        }}
      >
        <div style={{ display: 'flex', fontSize: 80, fontWeight: 'bold', color: 'white' }}>
          NotePostFlow
        </div>
        <div style={{ display: 'flex', fontSize: 40, color: '#888', marginTop: 20 }}>
          Veille IA • Résumés AI • Notes
        </div>
        <div style={{ display: 'flex', fontSize: 30, color: '#4ade80', marginTop: 40 }}>
          Gagnez du temps avec l'intelligence artificielle
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  )
}
```

Ensuite remplacer dans layout.tsx :
```typescript
url: `${env.NEXT_PUBLIC_SITE_URL}/api/og`
```

## Action immédiate
Pour l'instant, créez manuellement l'image avec Canva et placez-la dans `apps/frontend/public/og-image.png`