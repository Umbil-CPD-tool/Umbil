export type {
  CPDEntry,
  PDPGoal,
  ChatHistoryItem,
  ChatConversation,
  UsagePeriod,
} from "./types/domain";

export { WORKFLOW_TOOLS, TOOL_TAG_REGEX } from "./constants/tools";
export type { WorkflowToolId } from "./constants/tools";

export { WEB_PATHS, API_PATHS, APP_SCHEME } from "./constants/routes";

export { createApiClient, ApiError } from "./api/client";
export type { ApiClient, ApiClientConfig, ApiRequestOptions } from "./api/client";

export { ANSWER_STYLES } from "./constants/chat";
export type { AnswerStyle } from "./constants/chat";

export {
  ENABLE_OFFICIAL_GUIDANCE,
  encodeOfficialGuidanceTag,
  formatOfficialGuidanceShare,
  GUIDANCE_CLOSE,
  GUIDANCE_OPEN,
  isTrustedOfficialUrl,
  publisherForHost,
  splitOfficialGuidance,
} from "./officialGuidance";
export type { OfficialGuidanceLink } from "./officialGuidance";

export {
  GUIDED_REFLECTION_PROMPTS,
  emptyGuidedReflectionAnswers,
  hasGuidedReflectionAnswer,
  isStructuredReflection,
  seedLearnedFromNotes,
} from "./constants/reflection";
export type {
  GuidedReflectionAnswers,
  GuidedReflectionField,
  GuidedReflectionPrompt,
} from "./constants/reflection";

export {
  UK_NATIONS,
  WORKPLACE_SETTINGS,
  GRADE_SUGGESTIONS,
  SPECIALTY_SUGGESTIONS,
  GRADE_PLACEHOLDER,
  SPECIALTY_PLACEHOLDER,
  CLINICAL_PROFILE_HINT,
  MEMORY_FIELD_HINT,
  getMissingProfileFields,
  isProfileIncomplete,
  profileCompletionTitle,
  validateSignupClinicalProfile,
  inferAudienceBand,
  resolveSpecialty,
  formatClinicianSignOff,
  buildClinicianContext,
  buildClinicianPromptBlock,
  signupMetadataFromClinicalProfile,
  isUkNation,
  isWorkplaceSetting,
} from "./clinicalProfile";
export type {
  UkNation,
  WorkplaceSetting,
  AudienceBand,
  ClinicianContextInput,
  MissingProfileFields,
} from "./clinicalProfile";
