# CampusClock

> **Intelligente Aufgabenplanung und Kalenderverwaltung für Studierende**

CampusClock hilft dir, deine Studienzeit optimal zu nutzen: Die App plant deine Aufgaben automatisch in deinen Kalender ein – abgestimmt auf deine Energie, deine Arbeitszeiten und bestehende Termine. Je länger du die App nutzt, desto besser passt sie sich dir an.

---

## Inhaltsverzeichnis

- [Features](#features)
- [Tech-Stack](#tech-stack)
- [Voraussetzungen](#voraussetzungen)
- [Lokale Entwicklung](#lokale-entwicklung)
- [Umgebungsvariablen](#umgebungsvariablen)
- [Tests](#tests)
- [Architektur & Algorithmus](#architektur--algorithmus)
- [Deployment](#deployment)

---

## Features

| Feature | Beschreibung |
|---|---|
|  **Intelligente Aufgabenplanung** | Evolutionärer Algorithmus plant Aufgaben konfliktfrei in deinen Kalender ein (< 10 Sek.) |
|  **Google-Calendar-Integration** | Bestehende Termine werden automatisch als Sperrzeiten berücksichtigt |
|  **Energiebewusstes Planen** | Schwierige Aufgaben landen in deinen produktivsten Stunden |
|  **Semantic Feedback Loop** | Die App passt Dauer, Energieprofil und Deadline-Druck automatisch an dein Verhalten an |
|  **Gewohnheiten & Wiederholungen** | Wiederkehrende Aufgaben mit flexiblen Wiederholungsmustern |
|  **Projektverwaltung** | Aufgaben in Projekte und Unterprojekte strukturieren |
|  **Drag-and-Drop-Kalender** | Visuelle Kalenderansicht mit Drag-and-Drop zum manuellen Verschieben |
|  **Arbeitszeiten & Pausen** | Konfigurierbare Arbeitszeiten pro Wochentag |

---

## Tech-Stack

| Schicht | Technologie |
|---|---|
| **Framework** | [Next.js 15](https://nextjs.org) + [React 19](https://react.dev) |
| **Sprache** | [TypeScript 5.8](https://www.typescriptlang.org) |
| **API** | [tRPC 11](https://trpc.io) — end-to-end typsichere APIs |
| **Datenbank** | [PostgreSQL](https://www.postgresql.org) via [Prisma 6](https://prisma.io) |
| **Authentifizierung** | [Better Auth 1.3](https://www.better-auth.com) (Google OAuth) |
| **State Management** | [TanStack Query 5](https://tanstack.com/query) + [Zustand 5](https://zustand-demo.pmnd.rs) |
| **UI** | [Tailwind CSS 4](https://tailwindcss.com) · [Radix UI](https://www.radix-ui.com) · [shadcn/ui](https://ui.shadcn.com) |
| **Animationen** | [Framer Motion 12](https://www.framer.com/motion/) |
| **Caching** | [Upstash Redis](https://upstash.com) |
| **KI (Inferenz)** | [OpenAI API](https://platform.openai.com) (Inferenz) |
| **Testing** | [Vitest 4](https://vitest.dev) |

---

## Voraussetzungen

- **Node.js** ≥ 20
- **npm** ≥ 10
- **Docker** oder **Podman** (für die lokale PostgreSQL-Datenbank)
- Google-OAuth-App (für Login & Calendar-Integration)
- Upstash-Redis-Instanz (für Caching)

---

## Lokale Entwicklung

### 1. Repository klonen & Abhängigkeiten installieren

```bash
git clone https://github.com/CampusClock-Timeblocking/campusclock-nextjs.git
cd campusclock-nextjs
npm install
```

### 2. Umgebungsvariablen anlegen

```bash
cp .env.example .env
```

Alle erforderlichen Werte in `.env` befüllen (siehe [Umgebungsvariablen](#umgebungsvariablen)).

### 3. Datenbank starten

```bash
./start-database.sh
```

Das Skript startet einen PostgreSQL-Docker-Container auf Basis der `DATABASE_URL` in deiner `.env`.

### 4. Datenbankschema deployen

```bash
npm run db:migrate
```

### 5. Entwicklungsserver starten

```bash
npm run dev
```

Die App läuft danach unter [http://localhost:3000](http://localhost:3000) wenn Port 3000 verfügbar ist und nicht von einer anderen App genutzt wird.

---

## Umgebungsvariablen

Pflichtfelder:

| Variable | Beschreibung |
|---|---|
| `DATABASE_URL` | PostgreSQL-Connection-String |
| `BETTER_AUTH_SECRET` | Zufälliger Secret (min. 32 Zeichen) für die Session-Signierung |
| `BETTER_AUTH_URL` | Öffentliche URL der App (z. B. `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` | Google-OAuth-Client-ID (für Login) |
| `GOOGLE_CLIENT_SECRET` | Google-OAuth-Client-Secret (für Login) |
| `GOOGLE_CALENDAR_CLIENT_ID` | Google-OAuth-Client-ID (für Calendar-API) |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Google-OAuth-Client-Secret (für Calendar-API) |
| `KV_URL` / `KV_REST_API_URL` | Upstash-Redis-Verbindung |
| `KV_REST_API_TOKEN` | Upstash-Redis-Token (Lesen & Schreiben) |
| `KV_REST_API_READ_ONLY_TOKEN` | Upstash-Redis-Token (nur Lesen) |
| `REDIS_URL` | Redis-Connection-String |

Optionale Variablen:

| Variable | Beschreibung |
|---|---|
| `OPENAI_API_KEY` | OpenAI-API-Key für KI-gestützte Feldinferenz |
| `SOLVER_SERVICE_URL` | URL eines externen CP-SAT-Solver-Dienstes (standardmäßig nicht benötigt) |
| `SOLVER_TIMEOUT_MS` | Timeout für den Solver in Millisekunden (Standard: `10000`) |

---

## Tests

### Unit-Tests

```bash
npm run test
```

### Scheduler-E2E-Tests

Die E2E-Tests laufen gegen eine separate PostgreSQL-Testdatenbank und testen den Scheduling-Router vollständig.

1. Separate PostgreSQL-Datenbank starten.
2. `TEST_DATABASE_URL` in `.env` auf diese Datenbank setzen.
3. Bei erstmaliger Ausführung Migrationen anwenden:
   ```bash
   E2E_RUN_MIGRATIONS=1 npm run test:e2e:scheduler
   ```
4. Danach (ohne Migrationen):
   ```bash
   npm run test:e2e:scheduler
   ```
---

## Architektur & Algorithmus

### Scheduling-Algorithmus

CampusClock verwendet einen **evolutionären Algorithmus (EA)**, der vollständig in TypeScript läuft (kein externer Solver-Dienst notwendig):

```
Nutzer klickt „Planen"
       ↓
Aufgaben, Kalendereinträge & Präferenzen laden
       ↓
Evolutionärer Algorithmus (80 Individuen × bis zu 300 Generationen, max. 10 Sek.)
  ├── Greeddy Bin-Packing-Start
  ├── Turn-Selektion (k=3)
  ├── Uniform-Crossover
  └── Mutation (±15–180 Min.)
       ↓
Prioritätsbasiertes Nachfiltern
       ↓
Bei < 80 % Erfolgsrate: Horizont erweitern und erneut planen (bis zu 7 Mal)
       ↓
Ergebnis: eingeplante & nicht eingeplante Aufgaben
```

### Lernschleife

Nach jeder abgeschlossenen Aufgabe aktualisiert die App automatisch:

- **Dauermultiplikator** — passt zukünftige Zeitschätzungen an (exponentieller gleitender Durchschnitt)
- **Energieprofil** — lernt, zu welchen Stunden du am produktivsten bist
- **Deadline-Druck** — erhöht die Dringlichkeit, wenn Deadlines häufig verpasst werden

Weitere Details: [`docs/scheduler-algorithm-summary.md`](docs/scheduler-algorithm-summary.md) · [`docs/scheduler-explainer.md`](docs/scheduler-explainer.md)

### Vollständige Architekturdokumentation

→ [`src/docs/architecture.md`](src/docs/architecture.md)

---

## Deployment

Die App kann auf [Vercel](https://vercel.com), [Netlify](https://netlify.com) oder per Docker betrieben werden.

- [Vercel-Deployment](https://create.t3.gg/en/deployment/vercel)
- [Netlify-Deployment](https://create.t3.gg/en/deployment/netlify)
- [Docker-Deployment](https://create.t3.gg/en/deployment/docker)


Vielen Dank für die tolle Aufgabe, wir hatten sehr viel Spaß und Mühe eingesetzt um diese zu bearbeiten.
