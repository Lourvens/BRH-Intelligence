import type { ReactNode } from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  Sequence,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

import { useBrandFonts } from "./fonts";
import { font, fr, theme } from "./theme";

/* ------------------------------------------------------------------ shell */

const Backdrop: React.FC<{ children: ReactNode }> = ({ children }) => (
  <AbsoluteFill
    style={{
      background: `radial-gradient(1200px 700px at 78% -10%, rgba(0,156,220,0.22), transparent 60%),
                   radial-gradient(900px 600px at 4% 108%, rgba(232,216,51,0.10), transparent 62%),
                   linear-gradient(160deg, ${theme.navyDeep} 0%, ${theme.navy} 100%)`,
      color: theme.surface,
      fontFamily: font.body,
    }}
  >
    {children}
  </AbsoluteFill>
);

const Kicker: React.FC<{ children: ReactNode; opacity: number }> = ({ children, opacity }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 18,
      opacity,
      fontFamily: font.display,
      fontWeight: 600,
      fontSize: 22,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: theme.azure,
    }}
  >
    <span style={{ width: 44, height: 2, background: theme.azure, display: "block" }} />
    {children}
  </div>
);

const fade = (frame: number, start: number, duration = 18) =>
  interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

const rise = (frame: number, start: number, distance = 26) =>
  interpolate(frame, [start, start + 22], [distance, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });

/* ------------------------------------------------------------------ scene 1 */

const Intro: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ padding: "150px 140px", justifyContent: "space-between" }}>
      <Kicker opacity={fade(frame, 0)}>BRH Intelligence</Kicker>

      <div>
        <h1
          style={{
            margin: 0,
            fontFamily: font.display,
            fontWeight: 700,
            fontSize: 108,
            lineHeight: 1.04,
            letterSpacing: "-0.02em",
            opacity: fade(frame, 12),
            transform: `translateY(${rise(frame, 12, 34)}px)`,
          }}
        >
          L'économie haïtienne,
          <br />
          à la source.
        </h1>
        <p
          style={{
            margin: "34px 0 0",
            maxWidth: 980,
            fontSize: 32,
            lineHeight: 1.5,
            color: "rgba(255,255,255,0.74)",
            opacity: fade(frame, 34),
            transform: `translateY(${rise(frame, 34, 18)}px)`,
          }}
        >
          1 076 publications de la BRH. Chaque réponse renvoie au document et à la page.
        </p>
      </div>

      <div style={{ opacity: fade(frame, 54), fontSize: 22, color: "rgba(255,255,255,0.5)" }}>
        Corpus francophone · Citations page par page · Refus explicite
      </div>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ scene 2 */

const Metric: React.FC<{
  value: number;
  decimals?: number;
  suffix?: string;
  label: string;
  detail: string;
  start: number;
}> = ({ value, decimals = 0, suffix = "", label, detail, start }) => {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [start, start + 46], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const shown = value * progress;

  return (
    <div
      style={{
        flex: 1,
        padding: "34px 30px 30px",
        border: "1px solid rgba(227,233,242,0.16)",
        borderRadius: 18,
        background: "rgba(255,255,255,0.035)",
        opacity: fade(frame, start, 16),
        transform: `translateY(${rise(frame, start, 20)}px)`,
      }}
    >
      <div
        style={{
          fontFamily: font.display,
          fontWeight: 700,
          fontSize: 68,
          letterSpacing: "-0.02em",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {fr(shown, decimals)}
        <span style={{ fontSize: 40, color: "rgba(255,255,255,0.62)" }}>{suffix}</span>
      </div>
      <div style={{ marginTop: 10, fontSize: 24, color: theme.surface }}>{label}</div>
      <div style={{ marginTop: 6, fontSize: 19, color: "rgba(255,255,255,0.56)" }}>{detail}</div>
    </div>
  );
};

const Corpus: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ padding: "130px 140px", justifyContent: "center" }}>
      <Kicker opacity={fade(frame, 0)}>Ce qui est en place</Kicker>
      <h2
        style={{
          margin: "28px 0 54px",
          fontFamily: font.display,
          fontWeight: 700,
          fontSize: 74,
          letterSpacing: "-0.02em",
          opacity: fade(frame, 8),
        }}
      >
        Le corpus.
      </h2>

      <div style={{ display: "flex", gap: 26 }}>
        <Metric value={1076} label="documents" detail="transcrits" start={16} />
        <Metric value={15429} label="pages" detail="avec marqueur de page" start={24} />
        <Metric value={37.7} decimals={1} suffix=" M" label="caractères" detail="extraits" start={32} />
        <Metric value={1479} label="figures" detail="conservées" start={40} />
      </div>

      <p style={{ marginTop: 44, fontSize: 21, color: "rgba(255,255,255,0.5)", opacity: fade(frame, 52) }}>
        Inventoriés sur brh.ht, puis transcrits un par un — y compris les pages sans couche texte.
      </p>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ scene 3 */

const Extraction: React.FC = () => {
  const frame = useCurrentFrame();
  const hours = interpolate(frame, [10, 58], [0, 111.8], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const lots = interpolate(frame, [46, 96], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ padding: "130px 140px", justifyContent: "center" }}>
      <Kicker opacity={fade(frame, 0)}>L'extraction</Kicker>

      <div style={{ display: "flex", alignItems: "baseline", gap: 22, marginTop: 26 }}>
        <span
          style={{
            fontFamily: font.display,
            fontWeight: 700,
            fontSize: 168,
            letterSpacing: "-0.03em",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
        >
          {fr(hours, 1)}
        </span>
        <span style={{ fontFamily: font.display, fontWeight: 600, fontSize: 52, color: theme.azure }}>
          heures d'OCR
        </span>
      </div>

      <p style={{ margin: "30px 0 0", fontSize: 27, color: "rgba(255,255,255,0.76)", opacity: fade(frame, 56) }}>
        347 secondes par document en moyenne. 4 840 secondes pour le plus dense — 81 minutes.
      </p>

      <div style={{ marginTop: 56, opacity: fade(frame, 70) }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "rgba(255,255,255,0.56)" }}>
          <span>637 lots exécutés</span>
          <span>15 429 pages</span>
        </div>
        <div style={{ marginTop: 12, height: 10, borderRadius: 99, background: "rgba(255,255,255,0.12)" }}>
          <div
            style={{
              width: `${lots * 100}%`,
              height: "100%",
              borderRadius: 99,
              background: `linear-gradient(90deg, ${theme.azure}, ${theme.goldInk})`,
            }}
          />
        </div>
      </div>

      <p style={{ marginTop: 40, fontSize: 20, color: "rgba(255,255,255,0.46)", opacity: fade(frame, 92) }}>
        ≈ 29 $ de calcul. Une partie a tourné sur des GPU gratuits.
      </p>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ scene 4 */

const STEPS = [
  "Recherche dans 1 075 documents",
  "Retrouve les passages",
  "Vérifie la source",
  "Rédige — ou refuse",
];

const Step: React.FC<{ index: number; text: string; start: number }> = ({ index, text, start }) => {
  const frame = useCurrentFrame();
  const on = frame >= start;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginBottom: 16,
        opacity: on ? 1 : 0.28,
        transition: "none",
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          fontFamily: font.display,
          fontWeight: 700,
          fontSize: 15,
          color: on ? theme.navyDeep : "rgba(255,255,255,0.55)",
          background: on ? theme.azure : "rgba(255,255,255,0.10)",
        }}
      >
        {index + 1}
      </div>
      <span style={{ fontSize: 23, color: on ? theme.surface : "rgba(255,255,255,0.55)" }}>{text}</span>
    </div>
  );
};

const Assistant: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chip = spring({ frame: frame - 208, fps, config: { damping: 14, stiffness: 120 } });

  return (
    <AbsoluteFill style={{ padding: "110px 140px", justifyContent: "center" }}>
      <Kicker opacity={fade(frame, 0)}>L'assistant</Kicker>

      <div style={{ display: "flex", gap: 70, marginTop: 34 }}>
        <div style={{ width: 720 }}>
          <div style={{ fontSize: 19, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
            La question
          </div>
          <p
            style={{
              margin: "14px 0 40px",
              fontSize: 38,
              lineHeight: 1.34,
              fontWeight: 500,
              opacity: fade(frame, 10),
              transform: `translateY(${rise(frame, 10, 16)}px)`,
            }}
          >
            Une baisse des transferts de la diaspora affaiblit-elle la gourde ?
          </p>

          <div style={{ opacity: fade(frame, 46) }}>
            {STEPS.map((text, index) => (
              <Step key={text} index={index} text={text} start={56 + index * 18} />
            ))}
          </div>
        </div>

        <div
          style={{
            flex: 1,
            padding: "34px 36px",
            borderRadius: 20,
            background: "rgba(255,255,255,0.045)",
            border: "1px solid rgba(227,233,242,0.16)",
            opacity: fade(frame, 120),
            transform: `translateY(${rise(frame, 120, 22)}px)`,
          }}
        >
          <div style={{ fontSize: 19, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)" }}>
            La réponse
          </div>

          <ul style={{ margin: "20px 0 0", paddingLeft: 24, fontSize: 25, lineHeight: 1.52 }}>
            <li style={{ marginBottom: 14 }}>
              Les transferts pèsent <strong>≈ 19 % du PIB</strong> — trois fois la moyenne régionale.
            </li>
            <li style={{ marginBottom: 14 }}>
              Une contraction réduit l'offre de devises : pression à la <strong>dépréciation</strong>, le canal le plus persistant.
            </li>
            <li>
              Le TPS n'est pas un choc direct, mais il <strong>en augmente le risque</strong>.
            </li>
          </ul>

          <div style={{ marginTop: 30, display: "flex", alignItems: "center", gap: 16, transform: `scale(${chip})`, transformOrigin: "left center" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 18px",
                borderRadius: 10,
                background: theme.gold,
                color: theme.navy,
                fontFamily: font.display,
                fontWeight: 700,
                fontSize: 19,
              }}
            >
              Working Paper 4 · p. 1–5
            </span>
            <span style={{ fontSize: 18, color: "rgba(255,255,255,0.55)" }}>DREF · octobre 2026</span>
          </div>
        </div>
      </div>

      <p style={{ position: "absolute", bottom: 60, left: 140, fontSize: 18, color: "rgba(255,255,255,0.42)", opacity: fade(frame, 240) }}>
        Réponse réelle de l'agent, vérifiée dans le corpus.
      </p>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ scene 5 */

const Close: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill style={{ padding: "150px 140px", justifyContent: "center" }}>
      <h2
        style={{
          margin: 0,
          maxWidth: 1300,
          fontFamily: font.display,
          fontWeight: 700,
          fontSize: 86,
          lineHeight: 1.08,
          letterSpacing: "-0.02em",
          opacity: fade(frame, 0),
          transform: `translateY(${rise(frame, 0, 26)}px)`,
        }}
      >
        Chaque réponse renvoie
        <br />
        au document et à la page.
      </h2>

      <div style={{ marginTop: 56, display: "flex", alignItems: "center", gap: 20, opacity: fade(frame, 30) }}>
        <span style={{ width: 44, height: 2, background: theme.gold }} />
        <span
          style={{
            fontFamily: font.display,
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          BRH Intelligence
        </span>
      </div>

      <p style={{ marginTop: 24, fontSize: 19, color: "rgba(255,255,255,0.46)", opacity: fade(frame, 44) }}>
        Corpus francophone · 1 171 URL recensées · 15 429 pages transcrites
      </p>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ timeline */

/** 900 frames at 30 fps = 30,0 s — five scenes. */
export const BrhPresentation: React.FC = () => {
  useBrandFonts();

  return (
    <Backdrop>
      <Sequence from={0} durationInFrames={120}>
        <Intro />
      </Sequence>
      <Sequence from={120} durationInFrames={180}>
        <Corpus />
      </Sequence>
      <Sequence from={300} durationInFrames={150}>
        <Extraction />
      </Sequence>
      <Sequence from={450} durationInFrames={330}>
        <Assistant />
      </Sequence>
      <Sequence from={780} durationInFrames={120}>
        <Close />
      </Sequence>
    </Backdrop>
  );
};
