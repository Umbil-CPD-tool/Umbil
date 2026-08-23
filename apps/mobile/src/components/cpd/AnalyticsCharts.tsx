import Svg, { Circle, Line, Polygon, Polyline, Text as SvgText } from "react-native-svg";
import { View } from "react-native";

import { useTheme } from "@/providers/ThemeProvider";

type ProgressRingProps = {
  size?: number;
  stroke?: number;
  progress: number;
};

export const ProgressRing = ({
  size = 72,
  stroke = 6,
  progress,
}: ProgressRingProps) => {
  const { colors } = useTheme();
  const radius = size / 2;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset =
    circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <Circle
          stroke={colors.hoverBg}
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <Circle
          stroke={colors.primary}
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </Svg>
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* percent rendered by parent for font control */}
      </View>
    </View>
  );
};

type Point = { label: string; value: number };

export const HorizontalBars = ({
  data,
  height = 220,
}: {
  data: Point[];
  height?: number;
}) => {
  const { colors } = useTheme();
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <View style={{ gap: 10, minHeight: height }}>
      {data.map((d, index) => (
        <View key={d.label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 96 }}>
            {/* label via parent Text for Inter */}
          </View>
          <View
            style={{
              flex: 1,
              height: 18,
              borderRadius: 4,
              backgroundColor: colors.hoverBg,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${Math.round((d.value / max) * 100)}%`,
                height: "100%",
                borderRadius: 4,
                backgroundColor: colors.primary,
                opacity: index < 3 ? 1 : 0.4,
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

/** Simple radar for GMC domains (4 axes). */
export const GmcRadar = ({
  values,
  size = 220,
}: {
  values: number[];
  size?: number;
}) => {
  const { colors } = useTheme();
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size * 0.32;
  const maxVal = Math.max(1, ...values);
  const n = values.length;

  const pointAt = (i: number, r: number) => {
    const angle = (-Math.PI / 2) + (i * 2 * Math.PI) / n;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  const gridLevels = [0.33, 0.66, 1];
  const dataPoints = values.map((v, i) => pointAt(i, (v / maxVal) * maxR));
  const dataPoly = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <Svg width={size} height={size}>
      {gridLevels.map((level) => {
        const pts = Array.from({ length: n }, (_, i) => {
          const p = pointAt(i, maxR * level);
          return `${p.x},${p.y}`;
        }).join(" ");
        return (
          <Polygon
            key={level}
            points={pts}
            fill="none"
            stroke={colors.border}
            strokeWidth={1}
          />
        );
      })}
      {Array.from({ length: n }, (_, i) => {
        const p = pointAt(i, maxR);
        return (
          <Line
            key={i}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke={colors.border}
            strokeWidth={1}
          />
        );
      })}
      <Polygon
        points={dataPoly}
        fill={colors.primary}
        fillOpacity={0.45}
        stroke={colors.primary}
        strokeWidth={2}
      />
    </Svg>
  );
};

export const FrequencyLine = ({
  data,
  width = 320,
  height = 200,
  formatX,
}: {
  data: { date: string; count: number }[];
  width?: number;
  height?: number;
  formatX: (date: string) => string;
}) => {
  const { colors } = useTheme();
  if (data.length === 0) return null;

  const padL = 28;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const maxY = Math.max(1, ...data.map((d) => d.count));
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const pts = data.map((d, i) => {
    const x =
      padL + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = padT + innerH - (d.count / maxY) * innerH;
    return { x, y, ...d };
  });
  const poly = pts.map((p) => `${p.x},${p.y}`).join(" ");

  const yTicks = [0, Math.ceil(maxY / 2), maxY];

  return (
    <Svg width={width} height={height}>
      {yTicks.map((t) => {
        const y = padT + innerH - (t / maxY) * innerH;
        return (
          <Line
            key={t}
            x1={padL}
            y1={y}
            x2={width - padR}
            y2={y}
            stroke={colors.border}
            strokeDasharray="4 4"
          />
        );
      })}
      <Polyline
        points={poly}
        fill="none"
        stroke={colors.primary}
        strokeWidth={3}
      />
      {pts.map((p) => (
        <Circle
          key={p.date}
          cx={p.x}
          cy={p.y}
          r={4}
          fill={colors.surface}
          stroke={colors.primary}
          strokeWidth={2}
        />
      ))}
      {pts
        .filter((_, i) => i === 0 || i === pts.length - 1 || i % Math.ceil(pts.length / 4) === 0)
        .map((p) => (
          <SvgText
            key={`lbl-${p.date}`}
            x={p.x}
            y={height - 8}
            fontSize={9}
            fill={colors.textMuted}
            textAnchor="middle"
          >
            {formatX(p.date)}
          </SvgText>
        ))}
    </Svg>
  );
};
