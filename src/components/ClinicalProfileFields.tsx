"use client";

import {
  GRADE_PLACEHOLDER,
  GRADE_SUGGESTIONS,
  UK_NATIONS,
  WORKPLACE_SETTINGS,
} from "@/lib/clinicalProfile";

export type ClinicalProfileFieldValues = {
  grade: string;
  nation: string;
  workplace_setting: string;
};

type ClinicalProfileFieldsProps = {
  values: ClinicalProfileFieldValues;
  onChange: (field: keyof ClinicalProfileFieldValues, value: string) => void;
  disabled?: boolean;
  requireCore?: boolean;
  idPrefix?: string;
};

const ClinicalProfileFields = ({
  values,
  onChange,
  disabled = false,
  requireCore = false,
  idPrefix = "clinical",
}: ClinicalProfileFieldsProps) => {
  const gradeListId = `${idPrefix}-grade-suggestions`;

  return (
    <>
      <div className="form-group">
        <label className="form-label" htmlFor={`${idPrefix}-grade`}>
          Role / grade
        </label>
        <input
          id={`${idPrefix}-grade`}
          className="form-control"
          type="text"
          list={gradeListId}
          placeholder={GRADE_PLACEHOLDER}
          value={values.grade}
          onChange={(e) => onChange("grade", e.target.value)}
          disabled={disabled}
          required={requireCore}
          autoComplete="organization-title"
        />
        <datalist id={gradeListId}>
          {GRADE_SUGGESTIONS.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <p style={{ fontSize: "0.85rem", color: "var(--umbil-muted)", marginTop: 6, lineHeight: 1.4 }}>
          Freestyle is fine. Include specialty in the same line when useful (e.g. ST4 Cardiology).
        </p>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={`${idPrefix}-nation`}>
          UK nation (optional)
        </label>
        <select
          id={`${idPrefix}-nation`}
          className="form-control"
          value={values.nation}
          onChange={(e) => onChange("nation", e.target.value)}
          disabled={disabled}
        >
          <option value="">Select if you work in the UK</option>
          {UK_NATIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor={`${idPrefix}-workplace`}>
          Workplace setting (optional)
        </label>
        <select
          id={`${idPrefix}-workplace`}
          className="form-control"
          value={values.workplace_setting}
          onChange={(e) => onChange("workplace_setting", e.target.value)}
          disabled={disabled}
        >
          <option value="">Select your usual setting</option>
          {WORKPLACE_SETTINGS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </>
  );
};

export default ClinicalProfileFields;
