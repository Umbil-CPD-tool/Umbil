import { useMemo } from "react";
import { StyleSheet } from "react-native";
import Markdown from "react-native-markdown-display";

import { useTheme } from "@/providers/ThemeProvider";
import { radii, type ColorPalette } from "@/theme/colors";
import { fonts } from "@/theme/typography";

type Props = {
  children: string;
};

export const MarkdownBody = ({ children }: Props) => {
  const { colors } = useTheme();
  const markdownStyles = useMemo(() => makeMarkdownStyles(colors), [colors]);

  return (
    <Markdown style={markdownStyles} mergeStyle>
      {children}
    </Markdown>
  );
};

const makeMarkdownStyles = (colors: ColorPalette) =>
  StyleSheet.create({
    body: {
      fontFamily: fonts.regular,
      fontSize: 15,
      lineHeight: 24,
      color: colors.text,
    },
    strong: { fontFamily: fonts.bold },
    em: { fontStyle: "italic" },
    heading1: {
      fontFamily: fonts.bold,
      fontSize: 20,
      marginTop: 12,
      marginBottom: 4,
      color: colors.text,
    },
    heading2: {
      fontFamily: fonts.bold,
      fontSize: 18,
      marginTop: 12,
      marginBottom: 4,
      color: colors.text,
    },
    heading3: {
      fontFamily: fonts.semiBold,
      fontSize: 16,
      marginTop: 8,
      marginBottom: 4,
      color: colors.text,
    },
    paragraph: { marginTop: 0, marginBottom: 12 },
    bullet_list: { marginVertical: 8 },
    ordered_list: { marginVertical: 8 },
    list_item: { marginVertical: 4 },
    code_inline: {
      fontFamily: fonts.medium,
      backgroundColor: colors.hoverBg,
      paddingHorizontal: 4,
      borderRadius: 4,
    },
    fence: {
      fontFamily: fonts.regular,
      backgroundColor: colors.hoverBg,
      padding: 10,
      borderRadius: radii.sm,
      marginVertical: 6,
    },
    link: { color: colors.primary },
    table: {
      borderWidth: 1,
      borderColor: colors.border,
      marginVertical: 8,
      borderRadius: 8,
    },
    th: {
      fontFamily: fonts.semiBold,
      padding: 10,
      backgroundColor: colors.hoverBg,
    },
    td: { fontFamily: fonts.regular, padding: 10, fontSize: 14 },
    tr: { borderBottomWidth: 1, borderColor: colors.border },
  });
