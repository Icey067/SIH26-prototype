---
name: Mission Tactical Industrial
colors:
  surface: '#0f131d'
  surface-dim: '#0f131d'
  surface-bright: '#353944'
  surface-container-lowest: '#0a0e18'
  surface-container-low: '#171b26'
  surface-container: '#1c1f2a'
  surface-container-high: '#262a35'
  surface-container-highest: '#313540'
  on-surface: '#dfe2f1'
  on-surface-variant: '#bcc9cd'
  inverse-surface: '#dfe2f1'
  inverse-on-surface: '#2c303b'
  outline: '#869397'
  outline-variant: '#3d494c'
  surface-tint: '#4cd7f6'
  primary: '#4cd7f6'
  on-primary: '#003640'
  primary-container: '#06b6d4'
  on-primary-container: '#00424f'
  inverse-primary: '#00687a'
  secondary: '#ffb95f'
  on-secondary: '#472a00'
  secondary-container: '#ee9800'
  on-secondary-container: '#5b3800'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#1bbd85'
  on-tertiary-container: '#00452e'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#acedff'
  primary-fixed-dim: '#4cd7f6'
  on-primary-fixed: '#001f26'
  on-primary-fixed-variant: '#004e5c'
  secondary-fixed: '#ffddb8'
  secondary-fixed-dim: '#ffb95f'
  on-secondary-fixed: '#2a1700'
  on-secondary-fixed-variant: '#653e00'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0f131d'
  on-background: '#dfe2f1'
  surface-variant: '#313540'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: 0em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0em
  headline-sm:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.01em
  telemetry-lg:
    fontFamily: JetBrains Mono
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.02em
  telemetry-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: -0.01em
  telemetry-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter-xs: 0.25rem
  gutter-sm: 0.5rem
  gutter-md: 0.75rem
  gutter-lg: 1rem
  gutter-xl: 1.5rem
  panel-padding-sm: 0.5rem
  panel-padding-md: 0.75rem
  panel-padding-lg: 1.25rem
  edge-margin-mobile: 0.75rem
  edge-margin-desktop: 1.5rem
---

## Brand & Style
This design system serves an operational command center environment engineered for mission-critical railway block management and infrastructure scheduling. The design language marries industrial ergonomics with tactical aerospace command surfaces: purposeful, high-density, low-latency, and zero-distraction.

The emotional tone balances institutional authority, calm precision under high operational velocity, and tactical vigilance. Operating within intense 24/7 monitor banks, the system avoids pure pitch-black voids in favor of deep structural slate tones that minimize ocular fatigue, layered with crisp glassmorphic panels, fine-line technical framing, and high-visibility luminescent telemetry states.

## Colors
The palette is built around tactical functional contrast, using electric cyan as the telemetry and command accent, accompanied by signal safety colors that strictly adhere to railway signallers' conventions:

- **Primary (`#06B6D4` / Electric Cyan):** Active route selections, telemetry locks, dynamic cursor tracking, focus borders, and interactive command toggles.
- **Secondary (`#F59E0B` / Hazard Amber):** Advisory alerts, speed restrictions, pending engineering blocks, cautioned signal states, and temporary overhead wire neutral sections.
- **Tertiary (`#10B981` / Signal Green):** Cleared routes, energized catenary states, completed block inspections, and positive acknowledgment telemetry.
- **Emergency Critical (`#EF4444` / Emergency Red):** Absolute stop, train collision avoidance trigger, unauthorized sectional breaches, and safety-trip trips.
- **Surface Foundations:** Ground canvas starts at deep void `#0B0F19`, stepping to elevated containers at `#111827`.
- **Structural Borders:** Tactical structural division utilizing `#1E293B` for sub-panels and `#334155` for interactive/focused container outlines.

## Typography
Information is bifurcated cleanly into structural operational prose (Inter) and strict tabular telemetry metrics (JetBrains Mono).

- **Inter** delivers maximum glyph legibility across variable-distance terminal screens, handling section designations, station nomenclatures, and administrative reports.
- **JetBrains Mono** governs time-stamps, train numbers, block section kilometer coordinates (`KM 824+400`), signal aspects, and track circuit statuses. Tabular figures prevent layout shifts during live operational stream refreshes.
- All technical badges, signal legends, and categorical headers utilize `label-caps` with wide letter spacing for rapid scanning under high pressure.

## Layout & Spacing
A high-density operational fluid-grid structure optimized for multi-display workstations (1080p, 1440p, 4K video walls) with adaptive fallback to field tablets.

- **Desktop & Mission Wall (1280px and above):** 24-column granular sub-grid system with minimal 8px (`gutter-sm`) to 12px (`gutter-md`) channels, prioritizing simultaneous multi-stream telemetry (Track Layouts, Catenary Feeds, Gantt Block Slots, Signal interlocking panels).
- **Field Terminal & Tablets (768px - 1279px):** 12-column dynamic grid, 12px gutters, collapsible telemetry rail with dedicated thumb-reach action pads.
- **Mobile Handheld (below 768px):** Single-column stacked stream, 8px page margin, scrollable horizontal telemetry strips with frozen section identifiers.
- Spacing relies on compact multiples of 4px and 8px to pack actionable tactical data above the fold while preserving clean separation through structural lines rather than empty space.

## Elevation & Depth
Depth does not rely on blurry atmospheric drop-shadows, which produce visual muddiness in dense control interfaces. Visual depth is established through tonal glassmorphism, structured surface tiers, and calibrated luminance:

- **Base Ground (`#0B0F19`):** Non-interactive deep backdrop.
- **Surface Level 1 (`#111827` at 85% opacity with 12px backdrop blur):** Main structural panels, timeline lanes, and data consoles.
- **Surface Level 2 (`#1E293B` at 60% opacity with 8px backdrop blur):** Embedded sub-cards, inspector panels, telemetry cells, and flyout dialogues.
- **Borders & Outlines:** 1px hairline perimeter borders using `#1E293B` for unselected panels and `#334155` for hover/elevated surfaces.
- **Tactical Halos (Telemetry Glow):** When a block or signal transitions to an emergency or active tracking state, a crisp 1px border is augmented by a concentrated neon glow:
  - Cyan Active: `box-shadow: 0 0 12px rgba(6, 182, 212, 0.35)`
  - Amber Caution: `box-shadow: 0 0 12px rgba(245, 158, 11, 0.35)`
  - Emergency Hazard: `box-shadow: 0 0 16px rgba(239, 68, 68, 0.45)`

## Shapes
In line with industrial and aerospace hardware terminals, shape geometry is disciplined, geometric, and functional. 

- All standard containers, inspector cards, alert banners, and telemetry cells feature subtle 4px corner rounding (`roundedness: 1`), keeping edge silhouettes crisp without harsh pure-corner aliasing.
- Interactive status indicators, signal aspect lamps, and operational toggle pips use circular or chamfered geometries to differentiate interactive switches from static track architecture.
- Segmented block diagrams and track lines maintain strictly planar, orthogonal paths.

## Components

### Buttons & Tactical Triggers
- **Primary Operational Action (e.g., 'Grant Block', 'Energize Section'):** Electric Cyan background (`#06B6D4`), solid `#0B0F19` bold typography, 1px border (`#22D3EE`). Hover shifts to `#22D3EE` with a cyan outer halo.
- **Critical Action (e.g., 'Safety Cutoff', 'Emergency Cancel'):** Crimson background (`#EF4444`), white bold text, pulsing outer beacon ring.
- **Secondary Command Action:** Slate background (`#1E293B`), 1px border (`#334155`), cyan text. Hover: `#334155` background with border `#06B6D4`.
- **Height & Density:** Compact 32px height for desktop control consoles; 44px on touch/tablet viewports.

### Telemetry Badges & Status Indicators
- Constructed with high-contrast pill or chamfered tags with transparent background fills (15% opacity matching status color) framed by a 1px solid border.
- Include a 6px living telemetry pip that pulses slowly for active connections or flashes at 1Hz for uncleared caution alerts.
- Data values rendered strictly in `telemetry-sm` monospaced font.

### Cards & Mission Panels
- Base background `#111827` at 85% opacity, backdrop filter blur 12px, 1px border `#1E293B`.
- Panel headers feature an integrated top metadata rail displaying partition coordinates, division codes (e.g., `NCR-PRYJ-DIV`), and an active sync heartbeat.
- No rounded corner exceeding 4px (`0.25rem`).

### Form Controls & Switches
- **Input Fields:** `#0B0F19` interior fill, `#1E293B` baseline outline, JetBrains Mono font for block IDs and train codes. Active focus triggers a 1px `#06B6D4` border and cyan halo.
- **Checkboxes & Radios:** Sharp square/hexagonal geometry with inset neon checks when true.
- **Toggle Interlocks:** Dual-state industrial sliding switches with physical tactile track slots (`#0B0F19`) and high-visibility status pips (Cyan for energized/active, Slate for interlocked/offline).

### Data Grids & Telemetry Tables
- Striped with alternating surface layers (`#111827` and `#0E1422`), with razor-thin 1px horizontal dividers (`#1E293B`).
- Sticky headers featuring uppercase monospaced labels (`label-caps`) with directional sort indicators.
- Row-hover state applies a subtle electric cyan border-left (3px) and 10% cyan row background highlight for rapid cross-screen horizontal scanning across wide multi-column tables.