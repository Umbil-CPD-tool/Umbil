import { Pressable, Text, TextInput, View } from "react-native";

import {
  GRADE_PLACEHOLDER,
  GRADE_SUGGESTIONS,
  UK_NATIONS,
  WORKPLACE_SETTINGS,
} from "@umbil/shared";
import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing, type ColorPalette } from "@/theme/colors";
import { fonts } from "@/theme/typography";

export type ClinicalProfileFieldValues = {
  grade: string;
  nation: string;
  workplace_setting: string;
};

type Props = {
  values: ClinicalProfileFieldValues;
  onChange: (field: keyof ClinicalProfileFieldValues, value: string) => void;
  disabled?: boolean;
  /** Sign-up is a light form. Pass the light palette so a dark phone does not paint these controls black. */
  palette?: ColorPalette;
};

const ClinicalProfileFields = ({ values, onChange, disabled = false, palette }: Props) => {
  const { colors: themeColors, isDark } = useTheme();
  const colors = palette ?? themeColors;
  const keyboardAppearance = palette ? "light" : isDark ? "dark" : "light";

  const labelStyle = {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 6,
  };
  const inputStyle = {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.sm,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
    fontFamily: fonts.regular,
  };

  return (
    <View style={{ marginBottom: spacing.sm }}>
      <View style={{ marginBottom: spacing.md }}>
        <Text style={labelStyle}>Role / grade</Text>
        <TextInput
          style={inputStyle}
          value={values.grade}
          onChangeText={(v) => onChange("grade", v)}
          placeholder={GRADE_PLACEHOLDER}
          placeholderTextColor={colors.textMuted}
          keyboardAppearance={keyboardAppearance}
          autoCapitalize="sentences"
          editable={!disabled}
        />
        <Text
          style={{
            fontFamily: fonts.regular,
            fontSize: 12,
            lineHeight: 17,
            color: colors.textMuted,
            marginTop: 6,
          }}
        >
          Freestyle is fine. Include specialty in the same line when useful (e.g. ST4 Cardiology).
        </Text>
        <ChipRow
          options={GRADE_SUGGESTIONS}
          selected={values.grade}
          onSelect={(value) => onChange("grade", value)}
          disabled={disabled}
          palette={palette}
        />
      </View>

      <View style={{ marginBottom: spacing.md }}>
        <Text style={labelStyle}>UK nation (optional)</Text>
        <ChipRow
          options={UK_NATIONS}
          selected={values.nation}
          onSelect={(value) => onChange("nation", value === values.nation ? "" : value)}
          disabled={disabled}
          palette={palette}
        />
      </View>

      <View style={{ marginBottom: spacing.md }}>
        <Text style={labelStyle}>Workplace setting (optional)</Text>
        <ChipRow
          options={WORKPLACE_SETTINGS}
          selected={values.workplace_setting}
          onSelect={(value) =>
            onChange("workplace_setting", value === values.workplace_setting ? "" : value)
          }
          disabled={disabled}
          palette={palette}
        />
      </View>
    </View>
  );
};

const ChipRow = ({
  options,
  selected,
  onSelect,
  disabled,
  palette,
}: {
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
  palette?: ColorPalette;
}) => {
  const { colors: themeColors } = useTheme();
  const colors = palette ?? themeColors;

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 8,
      }}
    >
      {options.map((option) => {
        const active = selected === option;
        return (
          <Pressable
            key={option}
            onPress={() => onSelect(option)}
            disabled={disabled}
            style={{
              borderRadius: 999,
              borderWidth: 1,
              borderColor: active ? colors.primary : colors.border,
              backgroundColor: active ? colors.primary : colors.surface,
              paddingHorizontal: 10,
              paddingVertical: 6,
            }}
          >
            <Text
              style={{
                fontFamily: fonts.medium,
                fontSize: 12,
                color: active ? "#ffffff" : colors.text,
              }}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export default ClinicalProfileFields;
