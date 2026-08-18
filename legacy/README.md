# Legacy prototype — reference only

This folder holds the original single-file HTML prototype
(`fc-harlingen-app.html`), its data model documentation, the old
check scripts, and design reference images. None of it is deployed
or maintained going forward — it exists solely as source material
while the app is ported to `backend/` (AdonisJS) and `frontend/`
(Vite + React).

**Once the frontend migration (all components ported, data migrated
to the real database) is verified working, this entire folder should
be deleted.** It remains in git history regardless, so nothing is
lost by removing it from the working tree at that point.

| File | Superseded by |
|---|---|
| `fc-harlingen-app.html` | `frontend/` (component-by-component port) |
| `fc-harlingen-datamodel.html` | `backend/database/migrations/` (the migrations *are* the schema now) |
| `fc-harlingen-o19-2-programma.ics` | seed data for the `activiteiten`/`wedstrijden` tables |
| `controle/*.py` | no longer applicable — replaced by TypeScript + a real build/lint pipeline |
| `voorbeelden/*.png` | design reference for the tactics board / drawing tool port |
