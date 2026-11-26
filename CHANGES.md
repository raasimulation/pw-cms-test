# Portfolio motion update

Drop the `src/` folder from this zip onto your project's `src/` (it only contains changed and new files).

## Where to edit things
| What | File |
|---|---|
| Rotator + viewer transition timing, blur, easing, page colours | `src/assets/css/motion.css` (variables at the top) |
| Intro text / once-per-visit vs every load | `src/_data/site.json` → `intro_text`, `intro_repeat` (also in the CMS under Site settings) |
| Intro look, rings, timing | `src/assets/css/intro.css` (variables at the top) |
| Fonts | `src/assets/css/fonts.css` (+ the preload line in `src/_includes/base.njk`) |
| Rotator slot height mode | `data-ti-height="tallest"` or `"active"` in `src/index.njk` |

## Changed
- `src/index.njk`: rotator wrapper around the 4 paragraphs, `vt-layer` classes, loads `rotator.js`
- `src/_includes/base.njk`: intro overlay + pre-paint check, font preload, new stylesheets, Tone.js now `defer`
- `src/_includes/project.njk`: loads `fonts.css`
- `src/home.css`: font variables, page background variable, removed `html { background: white }`
- `src/assets/viewer.js`: blur transition, scroll restore fix, autoplay on reopen
- `src/_data/site.json`, `src/admin/config.yml`: `intro_text`, `intro_repeat`

## New
- `src/assets/rotator.js`, `src/assets/intro.js`
- `src/assets/css/motion.css`, `intro.css`, `fonts.css`
- `src/assets/fonts/allo/` (Allo 1.1.0, SIL Open Font License, see OFL.txt)
