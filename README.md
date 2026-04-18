# 🌍 Living Archive

A living constellation of cultural stories — where every bubble is a memory, and every memory deserves to be preserved forever.

Built for the **Creative Flourishing** hackathon theme, inspired by Dario Amodei's *Machines of Loving Grace*.

## ✨ Features

- **Floating Story Bubbles** — 8 cultural stories drift gently across a warm cream canvas. Hover to preview, click to read.
- **AI Memory Scrapbook** — Click "✦ AI Scrapbook" on any story to generate 5 personalised Ghibli-style illustrated scenes, painted by Claude based on the real details of that specific story.
- **Preserve a Story** — Submit your own story. Claude transforms it into a poetic archive entry and adds a new bubble to the constellation.
- **Community Chat** — Unlocks after you preserve a story. Chat with other storytellers, share stories, and feel less alone in the work of remembering.
- **Theme Filters** — Filter bubbles by theme (migration, family, memory, tradition, and more).
- **Live Search** — Search by name, culture, or theme.
- **Related Stories** — Each story shows connected stories that share themes.

## 🚀 Quick Start

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173)

## 🔑 API Key

This app uses the Anthropic API directly from the browser. It requires an API key to be handled by your environment or proxy. The `anthropic-dangerous-direct-browser-access: true` header is set for direct browser usage.

If running locally, you may need to set up a simple proxy or use the Claude.ai artifact runner which handles auth automatically.

## 🏗 Tech Stack

- **React 18** — UI
- **Vite** — Build tool
- **CSS-in-JS** — All styles inline, no external CSS framework
- **Anthropic API** — Powers story transformation, scrapbook scene extraction, and SVG illustration generation
- **Vanilla physics** — Custom requestAnimationFrame bubble physics engine

## 🎨 Design

Warm cream palette (`#f5f0e8`), Playfair Display serif typography, soft translucent bubbles with Ghibli-inspired colors. Every story bubble drifts gently and freezes on hover so you can click it.

## 📁 Structure

```
src/
  components/
    LivingArchive.jsx   # The entire app — one self-contained component
  main.jsx              # React entry point
index.html
package.json
vite.config.js
README.md
```

## 💡 Hackathon Context

*Creative flourishing* means ensuring that as AI handles more routine work, humans still find meaning through creativity, cultural expression, and connection to their heritage. Living Archive is a tool for exactly that — preserving stories that might otherwise be lost, making them beautiful, and connecting the people who carry them.

> "Every bubble is a story. Every story, a life."
