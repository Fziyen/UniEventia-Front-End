# Landing page screenshots

The landing page imports its screenshots from `src/uploads`:

- `src/uploads/dashboard.webp` — Discover dashboard with current events.
- `src/uploads/event-preview.webp` — expanded event card or final event creation preview.

Replace those files to update the screenshots. React bundles the imports and generates their public URLs; files in `src` cannot be loaded through a literal browser path. This public directory is not used for the screenshots.

Use 16:9 images, preferably 1920 × 1080 or larger. The page contains each image without cropping. Avoid private information or browser chrome in the screenshots.
