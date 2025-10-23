# Atera Tech-Stack Flow

Interaktive ReactFlow-Visualisierung (Vite + React + Tailwind) für Architektur- & Datenflüsse.

## Voraussetzungen

- Node.js 18+
- npm (oder kompatibler Paketmanager)

## Entwicklung starten

```bash
npm install
npm run dev
```

Der Dev-Server läuft anschließend unter [http://localhost:5173](http://localhost:5173).

## Produktion / Vercel Deployment

```bash
npm install
npm run build
```

Der Build erzeugt ein statisches `dist/`-Verzeichnis, das z. B. über Vercel als Static Site deployed werden kann. Vercel erkennt den Build automatisch (`npm run build`) und dient den Output aus `dist/` aus.

### 1-Klick-Redeploy auf Vercel

Das Repository enthält eine `vercel.json`, die Vercel explizit mitteilt, dass `npm run build` ausgeführt werden soll und das statische Ergebnis im Ordner `dist/` liegt. Push einfach diesen Stand auf dein GitHub-Repository und klicke anschließend in Vercel auf **Redeploy** – Vercel übernimmt Installation, Build und das Ausliefern ohne weitere Schritte.

## Features

- Zwei Layout-Modi (Cube & Lanes) mit persistierten Positionen je Layout
- Szenario-Filter für Flows (OrderCreated, Returns, etc.)
- Export/Import von Positionen & Layout als JSON
- Animierte Kanten mit Payload-JSON-Anzeige per Klick
- Sidebar mit Layout-/Szenario-Steuerung, Zoom, Legende & Theme-Editor
- TailwindCSS + CSS-Variablen für Branding-Farben
