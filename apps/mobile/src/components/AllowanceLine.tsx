import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { allowanceHint, type AllowanceKind } from "@umbil/shared";
import { getAllowance } from "@/lib/api";
import { useTheme } from "@/providers/ThemeProvider";
import { fonts } from "@/theme/typography";

export const AllowanceLine = ({ kind }: { kind: AllowanceKind }) => {
  const { colors } = useTheme();
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getAllowance()
      .then((data) => {
        if (!active || data.unlimited) {
          if (active) setText(null);
          return;
        }
        setText(allowanceHint(kind, data[kind].remaining));
      })
      .catch(() => {
        if (active) setText(null);
      });
    return () => {
      active = false;
    };
  }, [kind]);

  if (!text) return null;

  return (
    <Text style={[styles.line, { color: colors.textMuted, fontFamily: fonts.medium }]}>
      {text}
    </Text>
  );
};

const styles = StyleSheet.create({
  line: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
});
