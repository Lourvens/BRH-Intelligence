# Landing illustrations

`corpus-constellation.svg` is original artwork created for BRH Corpus. Its
palette follows the brand tokens in `app/globals.css`. It depicts a conceptual
research journey, not a measured graph or a live assistant response.

`corpus-constellation.png` is its transparent 2× raster export (1440 × 1360).
Regenerate from `apps/web` with the existing Sharp dependency:

```sh
node -e "require('sharp')('public/illustrations/corpus-constellation.svg').resize(1440,1360).png().toFile('public/illustrations/corpus-constellation.png')"
```

Typography inside these illustrations is decorative. Essential product copy
and links remain HTML, with descriptive alternative text on the illustrations.
No third-party stock image or Aceternity source code is included.
