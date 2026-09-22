# TODO: Conference photos

**Status:** waiting on photos. The "Conferencias anteriores" carousel on `/conferencia` is built
and currently holds one slide, the 2023 recap video. It turns into a swipeable gallery (arrows,
dots, peeking neighbors) automatically as soon as it has more than one slide.

## What we need

Feedback on the page so far is that **there aren't enough preaching photos**. Priorities:

1. **Preaching** — the pulpit during services, ideally several different preachers and
   missionaries. This is the gap people noticed.
2. **The congregation** — full sanctuary shots, people singing, altar calls.
3. **Missionary presentations** — a missionary at the front with their slides behind them.
4. **Fellowship** — meals, the missionary display tables, families.

Landscape (horizontal) photos work best; the carousel frames every photo at 16:9.

## How to add them

1. Resize each photo to about 1600 px wide and save it as a JPG. From the repo root:

   ```bash
   mkdir -p public/conferencia/galeria
   magick input.jpg -auto-orient -resize 1600x -quality 80 public/conferencia/galeria/2025-predicacion-1.jpg
   ```

   Keep each file under ~500 KB. Don't commit full-size camera photos.

2. Add an entry per photo to `PAST_GALLERY` in `src/Conference/conferenceContent.ts`, in the
   order they should appear:

   ```ts
   {
     kind: 'image',
     src: '/conferencia/galeria/2025-predicacion-1.jpg',
     alt: { es: 'El pastor predicando en la conferencia 2025', en: 'The pastor preaching at the 2025 conference' },
     caption: { es: 'Conferencia 2025', en: '2025 conference' }, // optional
   },
   ```

   `alt` is required in both languages (screen readers and search engines use it); the
   caption is optional.

3. Other YouTube videos can go in the same list with `{ kind: 'youtube', id: '<video id>', caption: {...} }`.
