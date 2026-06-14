# Konzept: Visueller Veranstaltungsflächen-Planer

> Web-App zum visuellen Planen von Veranstaltungsflächen (Festivals, Märkte,
> Messen, Indoor-Events). Objekte wie Food Trucks, Bühnen, Autos, Zelte etc.
> werden maßstabsgetreu per Drag & Drop auf einer Karte/Fläche platziert.

**Stand:** Konzeptphase · **Branch:** `claude/event-space-planning-tool-ruapqe`

---

## 1. Entscheidungen (aus Abstimmung)

| Thema           | Entscheidung                                                        |
| --------------- | ------------------------------------------------------------------- |
| Ansatz          | **2D zuerst**, Architektur 3D-fähig für später                      |
| Event-Typ       | **Indoor + Outdoor** gemischt                                       |
| Erster Schritt  | **Detailkonzept** (dieses Dokument), dann Implementierung           |
| Nutzung         | **Team / Mehrbenutzer** (Login, geteilte Projekte)                  |

---

## 2. Kernidee & Leitprinzip

Das vereinheitlichende Prinzip: **Jede Planungsfläche ist „ein Hintergrundbild
+ ein Maßstab".**

- **Outdoor:** Hintergrund = Satellitenbild (per Adresse/Karte geladen) oder
  hochgeladenes Drohnenfoto.
- **Indoor:** Hintergrund = hochgeladener Grundriss/Hallenplan (Bild oder PDF).

Egal woher das Bild kommt — der Nutzer legt **einmal den Maßstab fest** (eine
bekannte Strecke einzeichnen, z. B. „diese Linie = 20 m"). Ab dann sind alle
Objekte und Messungen maßstabsgetreu. Das macht Indoor & Outdoor mit *einer*
Editor-Engine möglich.

So vermeiden wir früh die Komplexität von echtem 3D, liefern aber sofort den
eigentlichen Planungs-Mehrwert: **echte Abstände, Fluchtwege, Kapazitäten,
Strom-/Wasserwege.**

---

## 3. Technische Architektur

### Bestehende Basis (bereits im Repo)
- **Next.js 13** (App Router), **TypeScript**, **TailwindCSS**
- **Supabase** (`@supabase/supabase-js`) — Postgres, Auth, Storage, Realtime
- `lucide-react` (Icons), `recharts` (Charts)

### Neu hinzuzufügen
| Zweck                      | Bibliothek / Dienst                              |
| -------------------------- | ------------------------------------------------ |
| 2D-Canvas / Drag & Drop    | `konva` + `react-konva`                          |
| Editor-State               | `zustand`                                         |
| Outdoor-Karte (Phase 3)    | `maplibre-gl` (frei) oder `mapbox-gl` (Token)    |
| Satellitenbild-Snapshot    | Mapbox Static Images API / MapTiler / Esri       |
| PDF/PNG-Export             | `jspdf` + Konva `toDataURL()`                     |
| PDF-Grundriss einlesen     | `pdfjs-dist` (PDF → Bild)                         |
| 3D-Präsentation (Phase 4)  | Gaussian Splatting Viewer (`three.js` / Luma)    |

### Warum Konva statt direkt Mapbox?
Konva ist eine 2D-Canvas-Engine mit Zoom/Pan, Ebenen, Transform-Handles,
Snapping — ideal für den Editor. Indoor-Grundrisse haben *keine* Geokoordinaten,
darum ist eine bild-basierte Engine die gemeinsame Grundlage. Outdoor-Satellit
holen wir als **statisches Bild** in dieselbe Engle. Eine *interaktive* Mapbox-
Karte kommt erst in Phase 3 als Erweiterung dazu.

### Render-/Datenfluss
```
Hintergrund (Upload oder Satellit-Snapshot)
        │
        ▼
  Konva Stage  ── Maßstab (px ↔ Meter)
        │
        ├─ Layer: Hintergrundbild
        ├─ Layer: Objekte (Placements: x, y, rotation, w, h)
        ├─ Layer: Messungen / Annotationen
        └─ Layer: Auswahl/Transform-Handles
        │
        ▼
  Supabase (Persistenz + Realtime-Sync fürs Team)
```

---

## 4. Datenmodell (Supabase / Postgres)

```
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
  background_url,             -- Bild in Supabase Storage
  bg_width_px, bg_height_px,
  scale_px_per_meter,         -- aus Maßstabskalibrierung
  geo_center_lat, geo_center_lng,  -- optional (Outdoor)
  geo_zoom,                   -- optional
  created_at, updated_at

asset_types                   -- Objektkatalog (global + teamspezifisch)
  id, team_id (nullable = global), category, name,
  default_width_m, default_length_m, icon, color

placements                    -- platzierte Objektinstanz auf einer Szene
  id, scene_id, asset_type_id,
  x, y, rotation, width_m, length_m,  -- width/length überschreibbar
  label, color, notes, z_index, created_at

annotations                   -- Messlinien, Texte, Zonen, Fluchtwege
  id, scene_id, kind ('measure'|'text'|'zone'|'path'),
  geometry (jsonb), style (jsonb), created_at

comments                      -- optional, Team-Feedback
  id, scene_id, user_id, x, y, body, resolved, created_at
```

### Row Level Security (RLS)
- Zugriff auf `projects`/`scenes`/`placements`/… nur, wenn der Nutzer Mitglied
  des zugehörigen `team_id` ist (Join über `team_members`).
- Schreibrechte abhängig von `role` (viewer = nur lesen).
- `asset_types`: globale (team_id IS NULL) für alle lesbar; teamspezifische nur
  fürs Team.

---

## 5. Objektkatalog (mit realen Maßen)

Vordefinierte, maßstabsgetreue Objekte (Default-Maße, anpassbar):

| Kategorie    | Objekt              | Maße (ca.)      |
| ------------ | ------------------- | --------------- |
| Gastro       | Food Truck          | 7,0 × 2,5 m     |
| Gastro       | Imbissstand / Bude  | 3,0 × 2,0 m     |
| Gastro       | Bierzelt-Garnitur   | 2,2 × 0,5 m     |
| Bühne        | Bühne klein         | 6 × 4 m         |
| Bühne        | Bühne mittel        | 10 × 8 m        |
| Bühne        | Bühne groß          | 14 × 12 m       |
| Fahrzeuge    | PKW                 | 4,5 × 1,8 m     |
| Fahrzeuge    | Transporter         | 6,0 × 2,2 m     |
| Fahrzeuge    | LKW / Auflieger     | 16,5 × 2,5 m    |
| Infrastruktur| Zelt 3×3 / 5×5      | variabel        |
| Infrastruktur| Toilettenwagen      | 6,0 × 2,4 m     |
| Infrastruktur| Stromverteiler      | 1,0 × 1,0 m     |
| Sicherheit   | Bauzaun-Element     | 3,5 × 0,2 m     |
| Zonen        | Fluchtweg / Sperr.  | frei zeichenbar |

Nutzer können eigene Objekte anlegen (Name, Maße, Farbe, Icon) → `asset_types`.

---

## 6. Feature-Übersicht (MVP → Ausbau)

**Editor (Kern)**
- [ ] Hintergrund: Bild-Upload (Foto/Grundriss/PDF) **oder** Satellit per Adresse
- [ ] Maßstabskalibrierung (Linie zeichnen → reale Länge eingeben)
- [ ] Objekt-Palette nach Kategorien, Drag & Drop auf die Fläche
- [ ] Verschieben, Drehen, Skalieren, Snapping, Raster, Mehrfachauswahl
- [ ] Messwerkzeug (Distanz/Fläche in Metern)
- [ ] Zonen & Fluchtwege zeichnen
- [ ] Speichern/Laden (Supabase)
- [ ] Export als PNG / PDF

**Team & Verwaltung**
- [ ] Login/Registrierung (Supabase Auth)
- [ ] Teams, Rollen (owner/admin/editor/viewer)
- [ ] Projekt- & Szenen-Verwaltung (Dashboard)
- [ ] Teilen per Link (read-only für Kunden/Behörden)

**Komfort (später)**
- [ ] Echtzeit-Kollaboration (Supabase Realtime)
- [ ] Kommentare/Pins auf der Fläche
- [ ] Kapazitäts-/Stückzahl-Auswertung (recharts)
- [ ] Versionen / Snapshots

**3D (Ziel)**
- [ ] Foto-/Video-Capture → Gaussian-Splatting-Modell (extern: Luma/Polycam)
- [ ] 3D-Viewer eingebettet als **Präsentationsschicht**
- [ ] Objektpositionen aus 2D in 3D-Szene spiegeln

---

## 7. Umsetzungs-Roadmap (Phasen)

### Phase 0 — Fundament
- Supabase-Schema + RLS-Policies (Migrationen)
- Auth-Flow (Login/Registrierung), Profil
- Teams + Mitgliedschaften
- Projekt-Dashboard (Liste, anlegen, öffnen)

### Phase 1 — 2D-Editor MVP ⭐ (erster sichtbarer Mehrwert)
- Szene anlegen mit Bild-Upload als Hintergrund
- Maßstabskalibrierung
- Konva-Canvas: Objektpalette, Drag & Drop, Move/Rotate/Resize
- Persistenz der Placements in Supabase
- Export PNG

### Phase 2 — Planungs-Werkzeuge & Team
- Messwerkzeug, Zonen/Fluchtwege, Snapping/Raster
- PDF-Export
- Rollen/Rechte, Teilen per Link
- Kapazitäts-Auswertung

### Phase 3 — Outdoor-Karte live
- Interaktive Satellitenkarte (MapLibre/Mapbox) als Hintergrund
- Geokoordinaten pro Placement, echte Geo-Maße automatisch
- Adresssuche / Geocoding

### Phase 4 — 3D-Präsentation
- Capture-Workflow (Anleitung + Upload), externe Splatting-Pipeline
- Web-3D-Viewer eingebettet
- 2D-Layout ↔ 3D-Szene verknüpfen

---

## 8. Offene Punkte / zu klären vor Phase 1

1. **Karten-Anbieter:** Mapbox (Token nötig, großzügiges Free-Tier) vs.
   MapTiler vs. Esri World Imagery. → für Outdoor-Satellit relevant.
2. **Hosting:** Vercel (passt zu Next.js) + Supabase Cloud — ok?
3. **Branding/Name** der App?
4. **Genehmigungs-Features** relevant? (z. B. normgerechte Fluchtweg-Breiten,
   Druck-Layouts für Behörden) — beeinflusst Phase 2.
5. **Mobile Nutzung** vor Ort wichtig (Tablet im Feld)? → beeinflusst UI.

---

## 9. Aufwandseinschätzung (grob)

| Phase   | Umfang                          | Größenordnung |
| ------- | ------------------------------- | ------------- |
| Phase 0 | Auth, Teams, Schema, Dashboard  | klein–mittel  |
| Phase 1 | 2D-Editor MVP                   | mittel        |
| Phase 2 | Werkzeuge + Team-Rechte         | mittel        |
| Phase 3 | Live-Karte / Geo                | mittel        |
| Phase 4 | 3D-Präsentation                 | groß          |

Empfehlung: **Phase 0 + 1 als erstes nutzbares Produkt**, dann iterativ.
