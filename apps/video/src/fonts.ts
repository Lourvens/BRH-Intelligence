import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

/**
 * Local woff2 files, copied from apps/web/app/fonts.
 *
 * Loading them from the bundle rather than Google Fonts keeps the render
 * offline and byte-identical to the site's typography.
 */
const faces = [
  new FontFace("Inter", `url(${staticFile("fonts/inter-latin.woff2")}) format("woff2")`, {
    weight: "100 900",
  }),
  new FontFace(
    "Montserrat",
    `url(${staticFile("fonts/montserrat-latin.woff2")}) format("woff2")`,
    { weight: "100 900" },
  ),
];

export function useBrandFonts(): void {
  const [handle] = useState(() => delayRender("Chargement des polices"));

  useEffect(() => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        continueRender(handle);
      }
    };
    Promise.all(faces.map((face) => face.load().then((loaded) => document.fonts.add(loaded))))
      .then(finish)
      .catch(finish);
    // A render must never hang on a font that failed to decode.
    const timeout = setTimeout(finish, 4000);
    return () => clearTimeout(timeout);
  }, [handle]);
}
