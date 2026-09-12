import { Pressable, Text, TextInput, View } from "react-native";

import {
  CLINICAL_PROFILE_HINT,
  GRADE_PLACEHOLDER,
  GRADE_SUGGESTIONS,
  SPECIALTY_PLACEHOLDER,
  SPECIALTY_SUGGESTIONS,
  UK_NATIONS,
  WORKPLACE_SETTINGS,
} from "@umbil/shared";
import { useTheme } from "@/providers/ThemeProvider";
import { radii, spacing } from "@/theme/colors";
import { fonts } from "@/theme/typography";

export type ClinicalProfileFieldValues = {
  grade: string;
  specialty: string;
  nation: string;
  workplace_setting: string;
};

type Props = {
  values: ClinicalProfileFieldValues;
  onChange: (field: keyof ClinicalProfileFieldValues, value: string) => void;
  disabled?: boolean;
};

const ClinicalProfileFields = ({ values, onChange, disabled = false }: Props) => {
  const { colors } = useTheme();

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
        <Text style={labelStyle}>Position / Grade</Text>
        <TextInput
          style={inputStyle}
          value={values.grade}
          onChangeText={(v) => onChange("grade", v)}
          placeholder={GRADE_PLACEHOLDER}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="sentences"
          editable={!disabled}
        />
        <ChipRow
          options={GRADE_SUGGESTIONS}
          selected={values.grade}
          onSelect={(value) => onChange("grade", value)}
          disabled={disabled}
        />
      </View>

      <View style={{ marginBottom: spacing.md }}>
        <Text style={labelStyle}>Specialty</Text>
        <TextInput
          style={inputStyle}
          value={values.specialty}
          onChangeText={(v) => onChange("specialty", v)}
          placeholder={SPECIALTY_PLACEHOLDER}
          placeholderTextColor={colors.textMuted}
          autoCapitalize="sentences"
          editable={!disabled}
        />
        <ChipRow
          options={SPECIALTY_SUGGESTIONS}
          selected={values.specialty}
          onSelect={(value) => onChange("specialty", value)}
          disabled={disabled}
        />
      </View>

      <View style={{ marginBottom: spacing.md }}>
        <Text style={labelStyle}>UK nation (optional)</Text>
        <ChipRow
          options={UK_NATIONS}
          selected={values.nation}
          onSelect={(value) => onChange("nation", value === values.nation ? "" : value)}
          disabled={disabled}
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
        />
      </View>

      <Text
        style={{
          fontFamily: fonts.regular,
          fontSize: 13,
          lineHeight: 18,
          color: colors.textMuted,
        }}
      >
        {CLINICAL_PROFILE_HINT}
      </Text>
    </View>
  );
};

const ChipRow = ({
  options,
  selected,
  onSelect,
  disabled,
}: {
  options: readonly string[];
  selected: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
}) => {
  const { colors } = useTheme();

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
