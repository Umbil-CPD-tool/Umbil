// In-house SVG chart primitives for the PSQ/MSF in-app results screens.
// Follows the same react-native-svg conventions as `@/components/cpd/AnalyticsCharts`
// (GmcRadar, FrequencyLine) and the donut/legend pattern in `WeeklySummaryCard`.
import { Text, View } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";

import { useTheme } from "@/providers/ThemeProvider";
import { fonts } from "@/theme/typography";

const GMC_TARGET = 4;
const SCALE_MAX = 5;
const AMBER = "#d97706";

export type DomainScoreDatum = {
  id: string;
  name: string;
  score: number | string;
};

const formatDomainLabel = (name: string) => {
  const match = name.match(/^Domain\s*(\d+)/i);
  if (match) return `Domain ${match[1]}`;
  return truncate(name, 16);
};

const truncate = (value: string, max: number) =>
  value.length > max ? `${value.slice(0, max - 1).trimEnd()}\u2026` : value;

/** Horizontal bar chart of GMC domain averages (out of 5) with a dashed target line at 4.0. */
export const DomainBarChart = ({
  data,
  width = 320,
  rowHeight = 28,
  gap = 14,
  labelWidth = 78,
}: {
  data: DomainScoreDatum[];
  width?: number;
  rowHeight?: number;
  gap?: number;
  labelWidth?: number;
}) => {
  const { colors } = useTheme();
  if (data.length === 0) return null;

  const valueWidth = 46;
  const trackWidth = Math.max(40, width - labelWidth - valueWidth);
  const topPad = 22;
  const bottomPad = 4;
  const height = topPad + data.length * rowHeight + (data.length - 1) * gap + bottomPad;
  const targetX = labelWidth + (GMC_TARGET / SCALE_MAX) * trackWidth;

  return (
    <View>
      <Svg width={width} height={height}>
        <SvgText
          x={targetX}
          y={topPad - 10}
          fontSize={9}
          fontWeight="600"
          fill={colors.textMuted}
          textAnchor="middle"
        >
          GMC target 4.0
        </SvgText>
        <Line
          x1={targetX}
          y1={topPad - 4}
          x2={targetX}
          y2={height - bottomPad}
          stroke={colors.textMuted}
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        {data.map((d, i) => {
          const y = topPad + i * (rowHeight + gap);
          const cy = y + rowHeight / 2 + 4;
          const isNumeric = typeof d.score === "number";
          const numericScore = isNumeric ? Number(d.score) : 0;
          const barW = isNumeric ? Math.max(2, (numericScore / SCALE_MAX) * trackWidth) : 0;
          const barColor = isNumeric && numericScore < GMC_TARGET ? AMBER : colors.primary;
          return (
            <G key={d.id}>
              <SvgText x={0} y={cy} fontSize={11} fontWeight="700" fill={colors.text}>
                {formatDomainLabel(d.name)}
              </SvgText>
              <Rect x={labelWidth} y={y} width={trackWidth} height={rowHeight} rx={6} fill={colors.hoverBg} />
              {isNumeric ? (
                <Rect x={labelWidth} y={y} width={barW} height={rowHeight} rx={6} fill={barColor} />
              ) : null}
              <SvgText
                x={labelWidth + trackWidth + valueWidth - 6}
                y={cy}
                fontSize={11}
                fontWeight="700"
                fill={isNumeric ? colors.text : colors.textMuted}
                textAnchor="end"
              >
                {isNumeric ? numericScore.toFixed(2) : "N/A"}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
};

/** Full domain name legend rendered below `DomainBarChart` (SVG text can't wrap long GMC domain names). */
export const DomainLegend = ({ data }: { data: DomainScoreDatum[] }) => {
  const { colors } = useTheme();
  if (data.length === 0) return null;

  return (
    <View style={{ marginTop: 10, gap: 4 }}>
      {data.map((d) => (
        <Text
          key={d.id}
          style={{ fontFamily: fonts.regular, fontSize: 11, color: colors.textMuted, lineHeight: 16 }}
        >
          {formatDomainLabel(d.name)} — {d.name.replace(/^Domain\s*\d+:\s*/i, "")}
        </Text>
      ))}
    </View>
  );
};

export type CategoryDatum = { name: string; value: number };

const CATEGORY_COLORS = ["#0d9488", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#64748b"];

/** Proportional breakdown bars (respondent roles / appointment types) — Views only, no SVG needed. */
export const CategoryBreakdown = ({ data }: { data: CategoryDatum[] }) => {
  const { colors } = useTheme();
  if (data.length === 0) return null;
  const total = data.reduce((sum, d) => sum + d.value, 0) || 1;

  return (
    <View style={{ gap: 12 }}>
      {data.map((d, i) => {
        const pct = Math.round((d.value / total) * 100);
        const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
        return (
          <View key={d.name} style={{ gap: 5 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1, marginRight: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                <Text
                  style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.text, flexShrink: 1 }}
                  numberOfLines={1}
                >
                  {d.name}
                </Text>
              </View>
              <Text style={{ fontFamily: fonts.semiBold, fontSize: 12, color: colors.textMuted }}>
                {d.value} · {pct}%
              </Text>
            </View>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.hoverBg, overflow: "hidden" }}>
              <View style={{ width: `${pct}%`, height: "100%", borderRadius: 4, backgroundColor: color }} />
            </View>
          </View>
        );
      })}
    </View>
  );
};
