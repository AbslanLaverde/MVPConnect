export type OnboardingFieldKind =
  | 'text'
  | 'email'
  | 'url'
  | 'number'
  | 'selection'
  | 'booleanTrue';

export interface OnboardingFieldRule {
  required: boolean;
  kind?: OnboardingFieldKind;
  min?: number;
  max?: number;
  allowedValues?: readonly string[];
}

export interface OnboardingFieldValidation {
  valid: boolean;
  error?: string;
}

const isEmpty = (value: unknown) =>
  value === undefined ||
  value === null ||
  (typeof value === 'string' && value.trim() === '') ||
  (Array.isArray(value) && value.length === 0);

export const validateOnboardingField = (
  value: unknown,
  rule: OnboardingFieldRule,
): OnboardingFieldValidation => {
  if (isEmpty(value)) {
    return rule.required
      ? { valid: false, error: 'This field is required.' }
      : { valid: true };
  }

  switch (rule.kind ?? 'text') {
    case 'email':
      return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
        ? { valid: true }
        : { valid: false, error: 'Enter a valid email address.' };
    case 'url': {
      if (typeof value !== 'string') return { valid: false, error: 'Enter a valid website URL.' };
      try {
        const url = new URL(value.trim());
        return url.protocol === 'http:' || url.protocol === 'https:'
          ? { valid: true }
          : { valid: false, error: 'Enter a valid website URL.' };
      } catch {
        return { valid: false, error: 'Enter a valid website URL.' };
      }
    }
    case 'number': {
      const number = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(number)) return { valid: false, error: 'Enter a valid number.' };
      if (rule.min !== undefined && number < rule.min) {
        return { valid: false, error: `Enter a value of ${rule.min} or more.` };
      }
      if (rule.max !== undefined && number > rule.max) {
        return { valid: false, error: `Enter a value of ${rule.max} or less.` };
      }
      return { valid: true };
    }
    case 'selection': {
      const values = Array.isArray(value) ? value : [value];
      const valid = values.every(
        (selection) => typeof selection === 'string' && rule.allowedValues?.includes(selection),
      );
      return valid
        ? { valid: true }
        : { valid: false, error: 'Choose a valid option.' };
    }
    case 'booleanTrue':
      return value === true
        ? { valid: true }
        : { valid: false, error: 'This confirmation is required.' };
    default:
      return typeof value === 'string' || typeof value === 'number'
        ? { valid: true }
        : { valid: false, error: 'Enter a valid value.' };
  }
};

export const isOnboardingStepValid = (
  data: Record<string, unknown>,
  rules: Record<string, OnboardingFieldRule>,
) => Object.entries(rules).every(([key, rule]) => validateOnboardingField(data[key], rule).valid);
