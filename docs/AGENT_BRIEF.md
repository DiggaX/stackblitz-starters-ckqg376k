# Agent Brief: Visueller Veranstaltungsflächen-Planer

> **Zweck dieses Dokuments:** Vollständiges Übergabe-Briefing für den nächsten
> Coding-Agenten (oder Entwickler), der die Implementierung übernimmt. Enthält
> Kontext, Entscheidungen, Referenzprodukt, Datenmodell, Roadmap und offene
> Punkte. Ergänzt (ersetzt nicht) `docs/KONZEPT.md` — dort steht die
> ursprüngliche Konzeptversion, hier die verfeinerte, umsetzungsreife Fassung
> nach Wettbewerbsrecherche.

**Repo:** `diggax/stackblitz-starters-ckqg376k`
**Branch:** `claude/event-space-planning-tool-ruapqe`
**Stand:** 2026-07-03
**Owner/Kontakt:** rene.moellers88@gmail.com

---

## 1. Auftrag in einem Satz

Baue eine Web-App, mit der Veranstalter ihre Eventfläche (Festival-Wiese,
Messehalle, Marktplatz) **maßstabsgetreu visuell planen** können, indem sie
Objekte (Food Trucks, Bühnen, Zelte, Fahrzeuge, Absperrungen, Toiletten,
Stromverteiler etc.) per **Drag & Drop** auf eine Karte/einen Grundriss
ziehen — im Team, mit Speicherung, Export und späterer Erweiterbarkeit.

---

## 2. Bereits getroffene Entscheidungen (nicht erneut zur Diskussion stellen)

| Frage                        | Entscheidung                                                             |
| ----------------------------- | ------------------------------------------------------------------------- |
| 2D vs. 3D                     | **2D-Editor zuerst.** 3D (aus Fotos/Photogrammetrie) ist **kein MVP-Ziel** mehr, siehe Abschnitt 4. |
| Indoor vs. Outdoor             | **Beides.** Outdoor = Live-Karte, Indoor = hochgeladener Grundriss.        |
| Nutzerkreis                    | **Team-fähig** von Anfang an: Login, mehrere Nutzer pro Projekt, Rollen.   |
| Vorgehen                       | Erst **Konzept/Architektur**, dann Implementierung in Phasen (nicht alles auf einmal). |
| Bestehender Tech-Stack         | **Nicht wechseln.** Next.js 13 (App Router) + Supabase + Tailwind ist gesetzt (siehe Abschnitt 6). |

---

## 3. Referenzprodukt: OnePlan (app.oneplan.io / oneplan.io)

Der Nutzer hat ein reales Konkurrenzprodukt als Vorbild genannt, das exakt
dasselbe Problem löst: **OnePlan** (Event-Site-Planning-Software).

- Beispiel-Link (Demo-Plan, evtl. abgelaufen/geteilt):
  `https://app.oneplan.io/share/f6la8o_XRl60dpp0OvDt7g?level_id=1cc57780-94f0-438a-9af1-c735c27831a4`
- Marketing-Site: `https://www.oneplan.io/`

**Wichtiger Hinweis für den nächsten Agenten:** Der Zugriff auf `app.oneplan.io`
und `www.oneplan.io` wurde in dieser Session per `WebFetch`/`curl` mit
HTTP 403 blockiert (Cloudflare/Bot-Schutz). Es gab in dieser Session **keinen
Browser-Tool-Zugriff** (kein computer-use/Playwright/Chrome-Extension), um die
App interaktiv zu testen. Die folgenden Erkenntnisse stammen aus
**Websuche-Snippets** (Marketing-Texte, Review-Seiten wie G2), nicht aus
eigener Beobachtung der UI. **Falls du (nächster Agent) Zugriff auf ein
Browser-Tool oder computer-use hast, lohnt es sich, den Demo-Link oben oder
`https://www.oneplan.io/all-event-planning/` direkt anzusehen, um die
Objektbibliothek/UI im Detail zu prüfen.** Falls der Nutzer eigene Screenshots
zur Verfügung stellt, priorisiere diese vor den unten stehenden Annahmen.

### 3.1 Was wir über OnePlan wissen (Stand der Recherche)

- **Map-First-Ansatz:** Basis-Canvas ist eine **zoombare, live nachladende
  Satelliten- oder Straßenkarte** (GIS-basiert, mehrere Kartentypen: Satellit,
  Luftbild, Schwarz-Weiß, hochauflösend) — **kein** statischer Screenshot als
  Hintergrund.
- **Kein 3D aus Fotos.** Auch der Marktführer in diesem Segment rekonstruiert
  keine 3D-Modelle aus Fotos/Videos. Das bestätigt: **3D ist für dieses Produkt
  kein notwendiges Feature**, nicht mal „nice to have" auf Marktführer-Niveau.
- **Objektbibliothek:** hunderte maßstabsgetreue Objekte — Zelte, Bühnen,
  Crowd-Barrieren, Toilettenwagen (Portable Toilets), Generatoren, Food Trucks,
  Zäune, Beschilderung, Fahrzeuge. Objekte bleiben beim Zoomen exakt
  maßstabsgetreu.
- **Workflow:** (1) Standort/Karte wählen → (2) Event anlegen, Team
  hinzufügen → (3) Objekte per Drag & Drop platzieren (explizit beworben:
  „kein CAD-Wissen, keine Ingenieursausbildung nötig") → (4) Echtzeit-Review
  im Team, Konflikte markieren → (5) Export als druckfertiger Plan, u. a. für
  **Genehmigungsanträge bei Behörden**.
- **Kollaboration:** mehrere Nutzer gleichzeitig am selben Plan, Rechte
  (Rollen), Notizen direkt an Objekten, Teilen per Link (wie der Demo-Link
  oben — read-only Share-Modus).
- **Zusatzfunktionen:** Crowd-Simulation, Ein-/Ausgangsplanung für
  Besucherströme, Sicherheits-/Fluchtwegplanung.
- **Preismodell (zur Einordnung, nicht bindend für uns):** Free-Tier bis
  25 Objekte pro Plan; kostenpflichtig für mehr Objekte/Events/Team-Größe.

### 3.2 Konsequenzen für unsere Architektur

1. **Live-Karte früher einbauen als ursprünglich geplant.** In der ersten
   Konzeptversion (`KONZEPT.md`) war die interaktive Satellitenkarte
   (MapLibre/Mapbox) erst „Phase 3". Nach dieser Recherche sollte sie **näher
   an Phase 1** rücken, da sie beim Referenzprodukt der zentrale
   Kern-Mechanismus ist, nicht nur ein Add-on. Empfehlung: Outdoor-Szenen
   nutzen von Anfang an eine echte Karte (MapLibre GL JS, freie Tiles), Indoor
   bleibt beim Bild-/PDF-Grundriss-Upload. Beide teilen sich dieselbe
   Objekt-Platzierungs-Logik (Placements-Tabelle), nur die
   Hintergrund-/Koordinatenquelle unterscheidet sich.
2. **3D-Phase entfällt bzw. wird ganz ans Ende gestellt** (kein
   Differenzierungsmerkmal gegenüber dem Referenzprodukt, hoher Aufwand,
   geringer Nutzen für die eigentliche Planungsaufgabe).
3. **Genehmigungs-/Compliance-Export ernst nehmen:** Da OnePlan explizit für
   Behörden-Genehmigungen genutzt wird, sollte unser PDF-/Druck-Export darauf
   ausgelegt sein (Maßstab sichtbar, Legende, Objektliste als Anhang).
4. **Free-Tier-Denke für Objektlimits:** Kein hartes Muss, aber als Idee für
   ein späteres Preismodell im Hinterkopf behalten (aktuell nicht Teil des
   MVP-Scopes).

---

## 4. Feature-Scope (aktualisiert)

### Kern-Editor
- Szene = Hintergrund (Live-Karte **oder** hochgeladenes Bild/PDF) + Maßstab
- Objekt-Palette mit Kategorien, Drag & Drop, Move/Rotate/Resize, Snapping
- Messwerkzeug (Distanz/Fläche), Zonen/Fluchtwege zeichnen
- Speichern/Laden über Supabase, Undo/Redo (mind. lokal im Editor-State)
- Export: PNG sofort, PDF mit Maßstab/Legende für Behörden-Anträge (Phase 2)

### Team & Verwaltung
- Supabase Auth (Login/Registrierung)
- Teams, Rollen (owner/admin/editor/viewer), Projekt-Dashboard
- Teilen per Link (read-only, ähnlich OnePlans Share-Link-Format)

### Outdoor (jetzt früher, siehe 3.2)
- Live-Karte (MapLibre GL JS + freie Tile-Quelle, z. B. MapTiler/Esri) als
  Hintergrund, Adresssuche/Geocoding, Objekte mit echten Geo-Koordinaten

### Indoor
- Bild-/PDF-Upload als Hintergrund, manuelle Maßstabskalibrierung
  (Referenzlinie einzeichnen → reale Länge eingeben)

### Nicht mehr im Scope (vorerst)
- ~~3D-Rekonstruktion aus Fotos/Videos (Photogrammetrie/Gaussian Splatting)~~
  — siehe 3.2, entfällt. Falls der Nutzer das später explizit will, neu
  bewerten, aber nicht proaktiv bauen.

---

## 5. Datenmodell (Supabase/Postgres) — unverändert aus KONZEPT.md, hier verbindlich

```sql
profiles          (1:1 zu auth.users)
  id, display_name, avatar_url, created_at

teams
  id, name, owner_id, created_at

team_members
  team_id, user_id, role ('owner'|'admin'|'editor'|'viewer')

projects                      -- eine Veranstaltung
  id, team_id, owner_id, name, description, event_date, created_at

scenes                        -- eine Planungsfläche/Layout im Projekt
  id, project_id, name, type ('indoor'|'outdoor'),
  background_url,             -- Bild in Supabase Storage (nur bei Bild-Hintergrund)
  bg_width_px, bg_height_px,
  scale_px_per_meter,         -- aus Maßstabskalibrierung (Indoor / Bild-Modus)
  geo_center_lat, geo_center_lng,  -- Outdoor: Kartenmittelpunkt
  geo_zoom,                   -- Outdoor: initialer Zoomlevel
  created_at, updated_at

asset_types                   -- Objektkatalog (global + teamspezifisch)
  id, team_id (nullable = global), category, name,
  default_width_m, default_length_m, icon, color

placements                    -- platzierte Objektinstanz auf einer Szene
  id, scene_id, asset_type_id,
  x, y, rotation, width_m, length_m,
  -- Indoor: x/y in Pixel relativ zum Hintergrundbild
  -- Outdoor: x/y als lat/lng ODER Web-Mercator-Koordinaten (Implementierungsdetail des Agenten)
  label, color, notes, z_index, created_at

annotations                   -- Messlinien, Texte, Zonen, Fluchtwege
  id, scene_id, kind ('measure'|'text'|'zone'|'path'),
  geometry (jsonb), style (jsonb), created_at

comments                      -- Team-Feedback, Pins auf der Fläche
  id, scene_id, user_id, x, y, body, resolved, created_at
```

**RLS:** Zugriff auf `projects`/`scenes`/`placements`/… nur für Mitglieder des
zugehörigen `team_id` (Join über `team_members`). Schreibrechte abhängig von
`role` (`viewer` = read-only). `asset_types` mit `team_id IS NULL` sind global
lesbar für alle, teamspezifische nur fürs eigene Team.

---

## 6. Tech-Stack

### Bereits im Repo vorhanden (nicht ändern)
- Next.js 13 (App Router), TypeScript, TailwindCSS
- `@supabase/supabase-js` — Postgres, Auth, Storage, Realtime
- `lucide-react` (Icons), `recharts` (Charts, für spätere Auswertungen)
- Bestehende Dateien: `app/page.tsx`, `app/layout.tsx`, `lib/supabase.ts`,
  Migrationen unter `supabase/migrations/` (bereits vorhandenes Schema prüfen,
  bevor neue Migrationen angelegt werden — `list_tables` via Supabase-MCP nutzen)

### Neu zu ergänzen
| Zweck                       | Bibliothek                                    |
| ---------------------------- | ---------------------------------------------- |
| 2D-Canvas / Drag & Drop      | `konva` + `react-konva`                        |
| Editor-State                 | `zustand`                                      |
| Live-Karte (Outdoor)         | `maplibre-gl` (kein Vendor-Lock-in, kein Token nötig bei MapTiler/Esri Free-Tier) |
| PDF-Export                   | `jspdf` + Konva `toDataURL()`                  |
| PDF-Grundriss einlesen       | `pdfjs-dist`                                   |

**Wichtig:** `.env` im Repo wurde bereits von Zugangsdaten bereinigt (siehe
Commit `d21b3dc`) — neue Supabase-Keys/Mapbox-/MapTiler-Tokens **niemals**
direkt committen, sondern über Umgebungsvariablen (`.env.local`, nicht
versioniert) und ggf. Vercel-Projekteinstellungen verwalten.

---

## 7. Roadmap (aktualisiert nach OnePlan-Recherche)

### Phase 0 — Fundament
- Supabase-Schema + RLS-Policies (Migrationen, siehe Abschnitt 5)
- Auth-Flow (Login/Registrierung), Profil
- Teams + Mitgliedschaften
- Projekt-Dashboard (Liste, anlegen, öffnen)

### Phase 1 — 2D-Editor MVP (Indoor-first, da einfacher zu validieren)
- Szene anlegen mit Bild-Upload als Hintergrund
- Maßstabskalibrierung
- Konva-Canvas: Objektpalette, Drag & Drop, Move/Rotate/Resize
- Persistenz der Placements in Supabase
- Export PNG

### Phase 2 — Outdoor-Live-Karte (vorgezogen ggü. ursprünglichem Konzept)
- MapLibre-Karte als Hintergrund-Alternative zur Szene
- Adresssuche/Geocoding, Objekte mit Geo-Koordinaten statt Pixel-Koordinaten
- Gemeinsame Placement-Logik für Indoor (Pixel) und Outdoor (Geo) im
  Editor-State vereinheitlichen (z. B. über eine Abstraktionsschicht
  „Weltkoordinaten ↔ Bildschirmkoordinaten")

### Phase 3 — Planungs-Werkzeuge & Team
- Messwerkzeug, Zonen/Fluchtwege, Snapping/Raster
- PDF-Export mit Legende/Maßstab (für Genehmigungsanträge)
- Rollen/Rechte, Teilen per Link (read-only)
- Kapazitäts-Auswertung (recharts)

### Phase 4 — Komfort & Ausbau (Backlog, nicht terminiert)
- Echtzeit-Kollaboration (Supabase Realtime)
- Kommentare/Pins auf der Fläche
- Crowd-Simulation / Ein-Ausgangsplanung (falls gewünscht)
- 3D-Präsentationsschicht — **nur falls der Nutzer das explizit erneut
  einfordert**, siehe Abschnitt 3.2. Nicht proaktiv umsetzen.

---

## 8. Objektkatalog (Startwerte für `asset_types`, global)

| Kategorie     | Objekt              | Maße (ca.)      |
| -------------- | -------------------- | ----------------- |
| Gastro         | Food Truck           | 7,0 × 2,5 m       |
| Gastro         | Imbissstand/Bude     | 3,0 × 2,0 m       |
| Gastro         | Bierzelt-Garnitur    | 2,2 × 0,5 m       |
| Bühne          | Bühne klein          | 6 × 4 m           |
| Bühne          | Bühne mittel         | 10 × 8 m          |
| Bühne          | Bühne groß           | 14 × 12 m         |
| Fahrzeuge      | PKW                  | 4,5 × 1,8 m       |
| Fahrzeuge      | Transporter          | 6,0 × 2,2 m       |
| Fahrzeuge      | LKW/Auflieger        | 16,5 × 2,5 m      |
| Infrastruktur  | Zelt 3×3 / 5×5       | variabel          |
| Infrastruktur  | Toilettenwagen       | 6,0 × 2,4 m       |
| Infrastruktur  | Stromverteiler       | 1,0 × 1,0 m       |
| Infrastruktur  | Generator            | 2,0 × 1,0 m       |
| Sicherheit     | Bauzaun-Element       | 3,5 × 0,2 m       |
| Sicherheit     | Crowd-Barriere        | 2,0 × 0,3 m       |
| Zonen          | Fluchtweg/Sperrzone   | frei zeichenbar   |

Nutzer können eigene Objekte anlegen (Name, Maße, Farbe, Icon) → landen in
`asset_types` mit gesetztem `team_id`.

---

## 9. Offene Punkte (bitte mit dem Nutzer klären, bevor blockierende
Entscheidungen getroffen werden)

1. **Karten-Anbieter für Outdoor:** MapTiler, Esri World Imagery oder Mapbox?
   (Kosten/Token-Pflicht unterscheiden sich — MapTiler/Esri haben nutzbare
   Free-Tiers ohne Kreditkarte, Mapbox ist verbreiteter aber tokenpflichtig.)
2. **Branding/Name der App** — noch nicht festgelegt.
3. **Genehmigungs-/Compliance-Anforderungen:** Gibt es konkrete Vorgaben
   (z. B. Mindestbreiten für Fluchtwege nach lokalem Recht), die ins
   PDF-Export-Format einfließen müssen?
4. **Mobile/Tablet-Nutzung vor Ort** — wichtig fürs UI-Grundlayout, noch nicht
   final entschieden.
5. **OnePlan-Screenshots ausstehend:** Der Nutzer wollte Screenshots der
   OnePlan-Demo liefern, um Objektbibliothek/UI-Details 1:1 vergleichen zu
   können. Falls diese im weiteren Verlauf zur Verfügung gestellt werden,
   bitte Abschnitt 3 und 8 entsprechend verfeinern (fehlende Objektkategorien
   ergänzen, UI-Layout-Anleihen prüfen).

---

## 10. Empfehlung für den Einstieg des nächsten Agenten

1. Dieses Dokument sowie `docs/KONZEPT.md` lesen.
2. Bestehendes Supabase-Schema via `list_tables`/`list_migrations` prüfen
   (nicht blind neue Migrationen anlegen, ohne den Ist-Zustand zu kennen).
3. Mit **Phase 0** beginnen (Auth, Teams, Datenmodell, Dashboard), dann
   **Phase 1** (2D-Editor MVP, Indoor-first).
4. Bei Unsicherheiten zu Punkt 9 (offene Punkte) aktiv beim Nutzer nachfragen,
   nicht annehmen.
5. Falls Browser-/computer-use-Tools verfügbar sind: OnePlan-Demo-Link aus
   Abschnitt 3 ansehen, um die Objektbibliothek und das UI-Layout aus erster
   Hand zu verifizieren, bevor Abschnitt 8 als final betrachtet wird.
