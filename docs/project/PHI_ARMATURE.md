# PHI armature: whole-page design vocabulary

This ties the **dynamic symmetry / φ armature** reference to concrete tokens and classes in the Brisbane Servers site. Proportions stay **viewport- and zoom-aware** via [`design-tokens.css`](../../website-brisbaneservers.com/src/styles/design-tokens.css) (`--phi-rhythm-root`, `rem`, `clamp`, `%`, `fr`).

## Vertical bands (lateral + center)

| Idea | Implementation |
|------|----------------|
| Narrow lateral bands + wide center | `main.main-phi-chassis` + `.section:not(.hero)` use a **3-column grid**: `1fr` \| `min(100vw − gutters, --container-max-width)` \| `1fr`. The `.container` sits in the **middle column**; decorative layers (`bg-pattern-*`, `phi-*` lines) stay `position: absolute` and still span the full section. |
| Fluid gutters | `--layout-padding-inline` includes **φ-weighted `vw`** (0.236 / 0.382) so side rhythm tracks the viewport. |

## Strokes and radii (borders, “atypical” corners)

| Token | Use |
|--------|-----|
| `--phi-stroke-hairline` | Hairlines that stay visible when zoomed (`max(1px, …)`). |
| `--phi-stroke-md` | Card / button borders. |
| `--phi-radius-sm` / `--phi-radius-md` / `--phi-radius-lg` | Stepped corners (alias `--radius-*`). |
| `--phi-radius-atypical-a` / `-b` / `-cta` | Asymmetric `border-radius` presets (TL TR BR BL). Primary CTAs use `--phi-radius-atypical-cta`; emphasized cards use `-b` via `.card-emphasis`. |

## Curves (optional section edges)

| Class | Effect |
|--------|--------|
| `.section-edge-curve-bottom` | `clip-path` ellipse at bottom center (φ-weighted height). |
| `.section-edge-curve-top` | Same at top. **Opt-in only**—clipping affects hit targets and overflow. |

## Symmetry lines (decorative armature)

Defined in [`geometric-detailing.css`](../../website-brisbaneservers.com/src/styles/geometric-detailing.css):

- `.phi-line-symmetrical` — bilateral vertical φ lines at 38.2% from each side.
- `.phi-lateral-symmetrical` — horizontal φ lines.

Add to a **section** (alongside existing patterns) for stronger grid cues.

## Typography ladder (semantic focus)

Semantic tiers in [`global.css`](../../website-brisbaneservers.com/src/styles/global.css) map importance to φ derivatives (e.g. `.semantic-high` / parent → larger φ multiples). **Section titles** use `.section-title` (φ-sqrt clamp); **body** in cards uses `.card-description` with length-aware classes when applied.

## Copy width + offset callouts

| Class | Role |
|--------|------|
| `.phi-measure-prose` | `max-width: var(--measure-prose)`. |
| `.phi-measure-article` | `max-width: var(--measure-article)`. |
| `.phi-focus-offset-start` | Start offset + thin primary border (φ-ratio-inv cap) for pull-quote / callout bands. |

## Section intros (title + lead, lateral)

`.section-intro-phi` — two columns **38.2% / 61.8%**; stacks ≤1024px. See [`LAYOUT_PHI_VIEWPORT.md`](./LAYOUT_PHI_VIEWPORT.md).

## Adoption checklist

1. On marketing `main`, add `class="main-phi-chassis"` (with existing `id` / `main-home` as needed).
2. Wrap left-aligned `h2` + lead `p` in `.section-intro-phi`.
3. Optionally add `.phi-line-symmetrical` on the first content section after the hero.
4. Prefer tokens above over raw `px` for borders and radii on new UI.
