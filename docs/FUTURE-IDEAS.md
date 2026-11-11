# Future ideas

Ideas we'd love to try someday. Nothing here is planned or built yet.

## AI summaries of quarterly reports

When a missionary uploads a quarterly report (PDF + comments), generate a short summary for the
admin staff: highlights, prayer requests, needs, and anything that needs a reply.

- Show it next to the report on the missionary's profile and in the Informes grid.
- Optional "prayer list" view: every current prayer request across all missionaries, for the
  prayer meeting or the bulletin.
- Admins decide what (if anything) goes on the public page, same as today with "Usar en la página".
- Cost estimate (Nov 2026): a 10-page report is about 25k tokens; with Claude Opus 5.5 that is
  roughly $0.12 per report, about $15 a year for ~30 missionaries × 4 quarters. A smaller model
  would cost a few dollars a year.
- To stay easy for other churches to adopt: off by default, each church brings its own API key,
  and the summary is stored as plain text next to the report (nothing locked to a provider).
- Keep the original PDF and comments forever; the summary is extra, never a replacement.
