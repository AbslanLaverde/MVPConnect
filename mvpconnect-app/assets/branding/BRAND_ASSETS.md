# MVPConnect logo assets

All derivatives are generated from `mvpconnect-logo.svg`, the authoritative
304 x 64 horizontal vector supplied by the brand owner. The artwork is paths
only and has a transparent background.

## Vector artwork

- `mvpconnect-logo.svg`: primary horizontal logo for application headers and
  wider placements.
- `mvpconnect-logo-native.png`: transparent 608 x 128 native rendering generated
  from the primary SVG for consistent Android and iOS gradient support.
- `mvpconnect-mark.svg`: exact standalone mark extracted from the primary logo.
- `mvpconnect-logo-monochrome.svg`: white horizontal logo for single-color use.
- `mvpconnect-mark-monochrome.svg`: white standalone mark for single-color use.

Do not stretch, recolor, add effects, or place either logo on a background that
reduces its contrast. Keep clear space around the logo equal to at least one
node diameter from the standalone mark.

## Platform artwork

- `../icon.png`: 1024 x 1024, opaque app-store icon. Rounded corners are added
  by the operating system and must not be baked into the file.
- `../adaptive-icon.png`: 1024 x 1024 transparent Android adaptive foreground.
- `../adaptive-icon-monochrome.png`: 1024 x 1024 transparent white foreground
  for Android themed icons.
- `../splash.png`: 1024 x 1024 transparent splash artwork.
- `../favicon.png`: 64 x 64 website favicon.
- `../pwa/icon-192.png` and `../pwa/icon-512.png`: optional installable-web-app
  icons.

The app-icon and splash background is `#0C0E13`. Regenerate every derivative
after the master changes by running `npm run brand:generate`.
