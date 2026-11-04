import React from "react";
import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { ALL_FORMATS, Input, UrlSource } from "mediabunny";

const FPS = 30;
const GAP_SECONDS = 0.5;
const TAIL = Math.round(GAP_SECONDS * FPS);

const COLORS = {
  panel: "#12305F",
  clickPanel: "#1A3E78",
  border: "#4C8DFF",
  white: "#FFFFFF",
  muted: "#B8C7E6",
  orange: "#FF8A1F",
  green: "#2ECC71",
  red: "#FF4D4F",
  ink: "#06122B",
};

const FONT =
  'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, "Courier New", monospace';

const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

type Narration = { file: string; text: string };

const NARRATIONS: Narration[] = [
  {
    file: "narasi1.mp3",
    text: "Saldo cuma cukup buat satu pesanan, tapi dua pesanan bisa lolos. Ini penyebabnya.",
  },
  {
    file: "narasi2.mp3",
    text: "Bayangin ada dua klik yang masuk ke server di waktu yang hampir sama.",
  },
  {
    file: "narasi3.mp3",
    text: "Dua-duanya baca saldo yang sama, seratus ribu. Terus sama-sama ngurangin. Hasilnya, dua pesanan tercatat, padahal saldonya cuma cukup buat satu.",
  },
  {
    file: "narasi4.mp3",
    text: "Penyebabnya, dua proses baca data duluan, sebelum salah satunya selesai nulis.",
  },
  {
    file: "narasi5.mp3",
    text: "Solusinya, kunci data yang lagi dipakai, atau pakai transaksi database. Follow buat belajar ngoding yang dijelasin visual.",
  },
];

export type RaceConditionProps = { sceneFrames: number[] };

export const defaultRaceProps: RaceConditionProps = {
  sceneFrames: [180, 180, 360, 180, 270],
};

const getAudioDuration = async (src: string) => {
  const input = new Input({
    formats: ALL_FORMATS,
    source: new UrlSource(src, { getRetryDelay: () => null }),
  });
  return input.computeDuration();
};

export const calculateMetadata: CalculateMetadataFunction<
  RaceConditionProps
> = async () => {
  const durations = await Promise.all(
    NARRATIONS.map((item) => getAudioDuration(staticFile(item.file))),
  );
  const sceneFrames = durations.map((seconds) =>
    Math.ceil((seconds + GAP_SECONDS) * FPS),
  );
  return {
    durationInFrames: sceneFrames.reduce((sum, value) => sum + value, 0),
    props: { sceneFrames },
  };
};

const cueFrame = (text: string, marker: string, narrationFrames: number) => {
  const index = text.indexOf(marker);
  const ratio = index < 0 ? 0 : index / text.length;
  return Math.round(ratio * narrationFrames);
};

const ramp = (frame: number, start: number, length: number) =>
  interpolate(frame, [start, start + length], [0, 1], clamp);

const buildChunks = (text: string) => {
  const words = text.split(" ");
  const chunks: string[] = [];
  let current = "";
  words.forEach((word) => {
    const candidate = current ? `${current} ${word}` : word;
    if (current && candidate.length > 44) {
      chunks.push(current);
      current = word;
    } else {
      current = candidate;
    }
    if (current.length >= 24 && /[,.?!]$/.test(current)) {
      chunks.push(current);
      current = "";
    }
  });
  if (current) {
    chunks.push(current);
  }
  return chunks;
};

const CODE_LINES = [
  "UPDATE akun SET saldo = saldo - 100000",
  "SELECT saldo FROM akun WHERE id = 1",
  "if (saldo >= harga) { bayar(); }",
  "BEGIN TRANSACTION",
  "SELECT saldo FROM akun FOR UPDATE",
  "COMMIT",
  "await db.query(sql)",
  "const saldo = await ambilSaldo(id)",
  "saldo = saldo - harga",
  "simpanPesanan(pesanan)",
];

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const loop = 2200;
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #070F26 0%, #0C1F4A 100%)",
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage:
            "linear-gradient(rgba(120, 160, 255, 0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(120, 160, 255, 0.07) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          backgroundPosition: `0px ${frame * 0.3}px`,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at 50% 45%, rgba(60, 120, 255, 0.2) 0%, rgba(60, 120, 255, 0) 60%)",
        }}
      />
      {CODE_LINES.map((line, index) => {
        const base = index * 220;
        const y = ((((base - frame * 0.6) % loop) + loop) % loop) - 150;
        return (
          <div
            key={line}
            style={{
              position: "absolute",
              left: 40 + ((index * 331) % 480),
              top: y,
              fontSize: 32,
              fontFamily: MONO,
              color: "rgba(150, 190, 255, 0.1)",
              whiteSpace: "nowrap",
            }}
          >
            {line}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const SceneFrame: React.FC<{
  frames: number;
  children: React.ReactNode;
}> = ({ frames, children }) => {
  const frame = useCurrentFrame();
  const edge = 10;
  const range = [0, edge, frames - edge, frames];
  const opacity = interpolate(frame, range, [0, 1, 1, 0], clamp);
  const x = interpolate(frame, range, [50, 0, 0, -50], clamp);
  return (
    <AbsoluteFill style={{ opacity, transform: `translateX(${x}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

const Subtitle: React.FC<{ text: string; narrationFrames: number }> = ({
  text,
  narrationFrames,
}) => {
  const frame = useCurrentFrame();
  const chunks = buildChunks(text);
  const sizes = chunks.map((chunk) => chunk.length + 1);
  const total = sizes.reduce((sum, value) => sum + value, 0);
  const starts = sizes.map((_, index) =>
    sizes.slice(0, index).reduce((sum, value) => sum + value, 0),
  );
  const position = (frame / narrationFrames) * total;
  let index = 0;
  starts.forEach((start, i) => {
    if (position >= start) {
      index = i;
    }
  });
  const startFrame = (starts[index] / total) * narrationFrames;
  const local = frame - startFrame;
  const opacity = interpolate(local, [0, 6], [0, 1], clamp);
  const lift = interpolate(local, [0, 6], [14, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        right: 80,
        bottom: 260,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          maxWidth: "100%",
          boxSizing: "border-box",
          padding: "18px 28px",
          borderRadius: 28,
          backgroundColor: "rgba(4, 10, 28, 0.74)",
          color: COLORS.white,
          fontSize: 52,
          fontWeight: 800,
          lineHeight: 1.25,
          textAlign: "center",
          wordBreak: "break-word",
          opacity,
          transform: `translateY(${lift}px)`,
        }}
      >
        {chunks[index]}
      </div>
    </div>
  );
};

const Heading: React.FC<{
  text: string;
  color: string;
  opacity?: number;
}> = ({ text, color, opacity = 1 }) => (
  <div
    style={{
      position: "absolute",
      left: 80,
      right: 80,
      top: 250,
      textAlign: "center",
      fontSize: 76,
      fontWeight: 800,
      color,
      opacity,
      textShadow: `0 0 36px ${color}66`,
    }}
  >
    {text}
  </div>
);

const DbIcon: React.FC<{ color: string }> = ({ color }) => (
  <svg
    width="84"
    height="84"
    viewBox="0 0 64 64"
    fill="none"
    stroke={color}
    strokeWidth="4"
    strokeLinecap="round"
  >
    <ellipse cx="32" cy="14" rx="20" ry="8" />
    <path d="M12 14v36c0 4.4 9 8 20 8s20-3.6 20-8V14" />
    <path d="M12 32c0 4.4 9 8 20 8s20-3.6 20-8" />
  </svg>
);

const ServerCard: React.FC<{
  saldo: string;
  wrong: boolean;
  scale?: number;
  opacity?: number;
}> = ({ saldo, wrong, scale = 1, opacity = 1 }) => {
  const accent = wrong ? COLORS.red : COLORS.border;
  return (
    <div
      style={{
        position: "absolute",
        left: 110,
        top: 790,
        width: 860,
        height: 420,
        borderRadius: 40,
        background: "linear-gradient(180deg, #17407A 0%, #102B57 100%)",
        border: `4px solid ${accent}`,
        boxShadow: `0 0 60px ${accent}77`,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transform: `scale(${scale})`,
        opacity,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          padding: "24px 40px",
          borderBottom: "3px solid rgba(255, 255, 255, 0.12)",
        }}
      >
        <DbIcon color={accent} />
        <span style={{ fontSize: 58, fontWeight: 800, color: COLORS.white }}>
          Server
        </span>
        <span
          style={{
            marginLeft: "auto",
            fontSize: 30,
            fontWeight: 600,
            color: COLORS.muted,
          }}
        >
          database
        </span>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontSize: 88,
            fontWeight: 800,
            color: wrong ? COLORS.red : COLORS.white,
            textShadow: wrong ? `0 0 30px ${COLORS.red}88` : "none",
          }}
        >
          Saldo: {saldo}
        </div>
      </div>
    </div>
  );
};

const ClickBox: React.FC<{
  label: string;
  left: number;
  translateY: number;
  readOpacity?: number;
  cutOpacity?: number;
}> = ({ label, left, translateY, readOpacity = 0, cutOpacity = 0 }) => (
  <div
    style={{
      position: "absolute",
      left,
      top: 470,
      width: 400,
      height: 230,
      borderRadius: 36,
      backgroundColor: COLORS.clickPanel,
      border: `5px solid ${COLORS.orange}`,
      boxShadow: `0 0 50px ${COLORS.orange}66`,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      transform: `translateY(${translateY}px)`,
    }}
  >
    <div style={{ fontSize: 58, fontWeight: 800, color: COLORS.white }}>
      {label}
    </div>
    <div
      style={{
        fontSize: 34,
        fontWeight: 600,
        color: COLORS.muted,
        opacity: readOpacity,
      }}
    >
      Baca: 100.000
    </div>
    <div
      style={{
        fontSize: 34,
        fontWeight: 700,
        color: COLORS.orange,
        opacity: cutOpacity,
      }}
    >
      Kurangi 100.000
    </div>
  </div>
);

const SceneIntro: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({
    frame: Math.max(0, frame - 6),
    fps,
    config: { damping: 200 },
    durationInFrames: 28,
  });
  const bar = ramp(frame, 24, 24);
  return (
    <SceneFrame frames={frames}>
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          padding: "0 80px 340px",
        }}
      >
        <div
          style={{
            fontSize: 108,
            fontWeight: 800,
            lineHeight: 1.2,
            textAlign: "center",
            color: COLORS.white,
            opacity: enter,
            transform: `translateY(${interpolate(enter, [0, 1], [60, 0])}px)`,
          }}
        >
          Dua pesanan lolos,{" "}
          <span
            style={{
              color: COLORS.orange,
              textShadow: `0 0 40px ${COLORS.orange}66`,
            }}
          >
            saldo cuma cukup satu?
          </span>
        </div>
        <div
          style={{
            marginTop: 56,
            width: 200 * bar,
            height: 14,
            borderRadius: 7,
            backgroundColor: COLORS.orange,
            boxShadow: `0 0 30px ${COLORS.orange}`,
          }}
        />
      </AbsoluteFill>
      <Subtitle
        text={NARRATIONS[0].text}
        narrationFrames={frames - TAIL}
      />
    </SceneFrame>
  );
};

const SceneKlik: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const narrationFrames = frames - TAIL;
  const text = NARRATIONS[1].text;
  const dropCue = cueFrame(text, "dua klik", narrationFrames);
  const serverIn = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 24,
  });
  const drop = spring({
    frame: Math.max(0, frame - dropCue),
    fps,
    config: { damping: 15, stiffness: 90 },
  });
  const translateY = interpolate(drop, [0, 1], [-730, 0]);
  return (
    <SceneFrame frames={frames}>
      <Heading text="Dua klik, satu server" color={COLORS.white} opacity={serverIn} />
      <ServerCard
        saldo="100.000"
        wrong={false}
        scale={interpolate(serverIn, [0, 1], [0.88, 1])}
        opacity={serverIn}
      />
      <ClickBox label="Klik 1" left={110} translateY={translateY} />
      <ClickBox label="Klik 2" left={570} translateY={translateY} />
      <Subtitle text={text} narrationFrames={narrationFrames} />
    </SceneFrame>
  );
};

const SceneBaca: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const narrationFrames = frames - TAIL;
  const text = NARRATIONS[2].text;
  const readCue = cueFrame(text, "baca", narrationFrames);
  const cutCue = cueFrame(text, "Terus", narrationFrames);
  const resultCue = cueFrame(text, "Hasilnya", narrationFrames);

  const readOpacity = ramp(frame, readCue, 12);
  const cutOpacity = ramp(frame, cutCue, 12);
  const resultIn = ramp(frame, resultCue, 14);
  const wrong = frame >= resultCue;
  const sinceResult = frame - resultCue;

  const pop = spring({
    frame: Math.max(0, sinceResult),
    fps,
    config: { damping: 10 },
  });
  const shaking = sinceResult >= 0 && sinceResult < 20;
  const amplitude = shaking ? 16 * (1 - sinceResult / 20) : 0;
  const shakeX = Math.sin(sinceResult * 2.8) * amplitude;
  const shakeY = Math.cos(sinceResult * 3.4) * amplitude * 0.6;
  const flash = interpolate(sinceResult, [0, 4, 20], [0, 0.28, 0], clamp);

  const stepLabel = wrong
    ? "Hasil: salah"
    : frame >= cutCue
      ? "Kurangi saldo"
      : "Baca saldo";
  const stepColor = wrong ? COLORS.red : COLORS.white;

  return (
    <SceneFrame frames={frames}>
      <AbsoluteFill
        style={{ transform: `translate(${shakeX}px, ${shakeY}px)` }}
      >
        <Heading text={stepLabel} color={stepColor} />
        <ServerCard
          saldo={wrong ? "0" : "100.000"}
          wrong={wrong}
          scale={wrong ? 1 + 0.04 * (1 - pop) : 1}
        />
        <ClickBox
          label="Klik 1"
          left={110}
          translateY={0}
          readOpacity={readOpacity}
          cutOpacity={cutOpacity}
        />
        <ClickBox
          label="Klik 2"
          left={570}
          translateY={0}
          readOpacity={readOpacity}
          cutOpacity={cutOpacity}
        />
        <div
          style={{
            position: "absolute",
            left: 80,
            right: 80,
            top: 1240,
            boxSizing: "border-box",
            padding: "22px 20px",
            borderRadius: 32,
            border: `4px solid ${COLORS.red}`,
            backgroundColor: "rgba(255, 77, 79, 0.14)",
            boxShadow: `0 0 50px ${COLORS.red}66`,
            textAlign: "center",
            opacity: resultIn,
            transform: `translateY(${interpolate(resultIn, [0, 1], [30, 0])}px)`,
          }}
        >
          <div style={{ fontSize: 64, fontWeight: 800, color: COLORS.red }}>
            2 pesanan tercatat
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 42,
              fontWeight: 600,
              color: "#FF8A8C",
            }}
          >
            Saldo tidak cukup untuk 2 pesanan
          </div>
        </div>
      </AbsoluteFill>
      <AbsoluteFill
        style={{ backgroundColor: COLORS.red, opacity: flash, pointerEvents: "none" }}
      />
      <Subtitle text={text} narrationFrames={narrationFrames} />
    </SceneFrame>
  );
};

const TL_LEFT = 120;
const TL_WIDTH = 840;

const TimelineBar: React.FC<{
  from: number;
  to: number;
  top: number;
  color: string;
  label: string;
  progress: number;
}> = ({ from, to, top, color, label, progress }) => (
  <div
    style={{
      position: "absolute",
      left: TL_LEFT + from * TL_WIDTH,
      top,
      width: (to - from) * TL_WIDTH * progress,
      height: 110,
      borderRadius: 24,
      backgroundColor: color,
      boxShadow: `0 0 30px ${color}88`,
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 40,
      fontWeight: 800,
      color: COLORS.ink,
      whiteSpace: "nowrap",
    }}
  >
    {label}
  </div>
);

const LaneLabel: React.FC<{ text: string; top: number }> = ({ text, top }) => (
  <div
    style={{
      position: "absolute",
      left: TL_LEFT,
      top,
      fontSize: 38,
      fontWeight: 700,
      color: COLORS.muted,
    }}
  >
    {text}
  </div>
);

const ScenePenyebab: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const narrationFrames = frames - TAIL;
  const text = NARRATIONS[3].text;
  const readCue = cueFrame(text, "baca data", narrationFrames);
  const bandCue = cueFrame(text, "sebelum", narrationFrames);
  const writeCue = cueFrame(text, "selesai nulis", narrationFrames);

  const titleIn = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 24,
  });
  const readProgress = ramp(frame, readCue, 24);
  const bandIn = ramp(frame, bandCue, 16);
  const writeProgress = ramp(frame, writeCue, 24);

  return (
    <SceneFrame frames={frames}>
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 230,
          textAlign: "center",
          fontSize: 68,
          fontWeight: 800,
          lineHeight: 1.25,
          color: COLORS.white,
          opacity: titleIn,
          transform: `translateY(${interpolate(titleIn, [0, 1], [40, 0])}px)`,
        }}
      >
        <span style={{ color: COLORS.orange }}>Penyebab:</span> dua proses
        membaca data sebelum salah satunya selesai menulis
      </div>

      <div
        style={{
          position: "absolute",
          left: TL_LEFT + 0.12 * TL_WIDTH,
          top: 790,
          width: 0.38 * TL_WIDTH,
          height: 360,
          borderRadius: 24,
          backgroundColor: "rgba(255, 77, 79, 0.2)",
          border: `3px dashed ${COLORS.red}`,
          opacity: bandIn,
        }}
      />

      <LaneLabel text="Proses A" top={770} />
      <TimelineBar
        from={0}
        to={0.28}
        top={820}
        color={COLORS.border}
        label="Baca"
        progress={readProgress}
      />
      <TimelineBar
        from={0.5}
        to={0.76}
        top={820}
        color={COLORS.orange}
        label="Tulis"
        progress={writeProgress}
      />

      <LaneLabel text="Proses B" top={960} />
      <TimelineBar
        from={0.12}
        to={0.42}
        top={1010}
        color={COLORS.border}
        label="Baca"
        progress={readProgress}
      />
      <TimelineBar
        from={0.56}
        to={0.9}
        top={1010}
        color={COLORS.orange}
        label="Tulis"
        progress={writeProgress}
      />

      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1170,
          textAlign: "center",
          fontSize: 42,
          fontWeight: 700,
          color: COLORS.red,
          opacity: bandIn,
        }}
      >
        Keduanya baca saldo lama
      </div>

      <div
        style={{
          position: "absolute",
          left: TL_LEFT,
          top: 1262,
          width: TL_WIDTH,
          height: 6,
          borderRadius: 3,
          backgroundColor: COLORS.muted,
          opacity: 0.6,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: TL_LEFT,
          width: TL_WIDTH,
          top: 1282,
          textAlign: "right",
          fontSize: 32,
          fontWeight: 600,
          color: COLORS.muted,
        }}
      >
        waktu →
      </div>
      <Subtitle text={text} narrationFrames={narrationFrames} />
    </SceneFrame>
  );
};

const LockIcon: React.FC<{ lift: number }> = ({ lift }) => (
  <svg
    width="300"
    height="360"
    viewBox="0 0 200 240"
    style={{ filter: `drop-shadow(0 0 28px ${COLORS.green}aa)` }}
  >
    <g transform={`translate(0 ${-lift})`}>
      <path
        d="M52 110 V72 a48 48 0 0 1 96 0 V110"
        fill="none"
        stroke={COLORS.green}
        strokeWidth="18"
        strokeLinecap="round"
      />
    </g>
    <rect x="24" y="104" width="152" height="116" rx="24" fill={COLORS.green} />
    <circle cx="100" cy="150" r="16" fill={COLORS.ink} />
    <rect x="94" y="156" width="12" height="36" rx="5" fill={COLORS.ink} />
  </svg>
);

const SceneSolusi: React.FC<{ frames: number }> = ({ frames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const narrationFrames = frames - TAIL;
  const text = NARRATIONS[4].text;
  const lockCue = cueFrame(text, "kunci", narrationFrames);
  const ctaCue = cueFrame(text, "Follow", narrationFrames);

  const headIn = spring({
    frame,
    fps,
    config: { damping: 200 },
    durationInFrames: 24,
  });
  const lock = spring({
    frame: Math.max(0, frame - lockCue),
    fps,
    config: { damping: 9, stiffness: 140 },
  });
  const cta = spring({
    frame: Math.max(0, frame - ctaCue),
    fps,
    config: { damping: 14 },
  });

  return (
    <SceneFrame frames={frames}>
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 230,
          textAlign: "center",
          fontSize: 72,
          fontWeight: 800,
          lineHeight: 1.25,
          color: COLORS.green,
          textShadow: `0 0 40px ${COLORS.green}66`,
          opacity: headIn,
          transform: `translateY(${interpolate(headIn, [0, 1], [40, 0])}px)`,
        }}
      >
        Solusi: kunci data (lock) atau pakai transaksi database
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 700,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <LockIcon lift={36 * (1 - lock)} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 80,
          right: 80,
          top: 1230,
          display: "flex",
          justifyContent: "center",
          opacity: Math.min(1, cta),
          transform: `scale(${interpolate(cta, [0, 1], [0.85, 1])})`,
        }}
      >
        <div
          style={{
            maxWidth: "100%",
            boxSizing: "border-box",
            padding: "24px 44px",
            borderRadius: 60,
            backgroundColor: COLORS.orange,
            boxShadow: `0 0 50px ${COLORS.orange}88`,
            color: COLORS.ink,
            fontSize: 50,
            fontWeight: 800,
            textAlign: "center",
          }}
        >
          Follow buat belajar ngoding visual
        </div>
      </div>
      <Subtitle text={text} narrationFrames={narrationFrames} />
    </SceneFrame>
  );
};

const SCENES: React.FC<{ frames: number }>[] = [
  SceneIntro,
  SceneKlik,
  SceneBaca,
  ScenePenyebab,
  SceneSolusi,
];

export const RaceCondition: React.FC<RaceConditionProps> = ({
  sceneFrames,
}) => {
  const starts = sceneFrames.map((_, index) =>
    sceneFrames.slice(0, index).reduce((sum, value) => sum + value, 0),
  );
  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <Background />
      {SCENES.map((Scene, index) => (
        <Sequence
          key={NARRATIONS[index].file}
          from={starts[index]}
          durationInFrames={sceneFrames[index]}
        >
          <Audio src={staticFile(NARRATIONS[index].file)} />
          <Scene frames={sceneFrames[index]} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
