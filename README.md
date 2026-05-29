# Content Studio — Liminal Labs

Generador de contenido IA para redes sociales. Gestiona las 4 marcas de Liminal Labs con un solo flujo.

## Marcas
- **VEIL** — Astrología e introspección psicológica
- **LIMINAL** — Arquitectura sonora inmersiva  
- **TAVLO** — Gestión gastronómica
- **ASTERON AI** — Soluciones IA para pymes

## Features
- Generación de copy con IA (captions, ideas, carruseles, hashtags)
- Preview visual en canvas (1:1 y 9:16)
- Integración con Canva para diseño final con fotos
- Descarga PNG directa
- Voz y tono personalizada por marca

## Stack
- Node.js + Express (proxy server)
- Vanilla HTML/CSS/JS (frontend en `/public`)
- Anthropic Claude API
- Canvas API para preview visual
- Canva MCP para integración de diseño

## Setup en Render
1. Crear **Web Service** apuntando a este repo
2. Build command: `npm install`
3. Start command: `npm start`
4. Variable de entorno: `ANTHROPIC_API_KEY=sk-ant-...`

## Estructura
```
content-studio/
├── server.js        ← proxy Express (llama a Anthropic)
├── package.json
└── public/
    └── index.html   ← app frontend
```

---
Built with Claude · Liminal Labs 2025
