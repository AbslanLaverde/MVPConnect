import { isOnboardingStepValid, validateOnboardingField } from '../onboardingValidation';

describe('onboarding validation', () => {
  it('treats an empty optional field as valid', () => {
    expect(validateOnboardingField('', { required: false, kind: 'url' }).valid).toBe(true);
  });

  it('rejects a populated invalid optional field', () => {
    expect(validateOnboardingField('abc', { required: false, kind: 'url' })).toEqual({
      valid: false,
      error: 'Enter a valid website URL.',
    });
  });

  it('validates email, URL, number range, and selection rules', () => {
    expect(validateOnboardingField('artist@example.com', { required: true, kind: 'email' }).valid).toBe(true);
    expect(validateOnboardingField('https://example.com', { required: false, kind: 'url' }).valid).toBe(true);
    expect(validateOnboardingField(250, { required: true, kind: 'number', min: 1, max: 1000 }).valid).toBe(true);
    expect(validateOnboardingField('ROCK', {
      required: true,
      kind: 'selection',
      allowedValues: ['ROCK', 'JAZZ'],
    }).valid).toBe(true);
  });

  it('requires every required field and validates every populated optional field', () => {
    const rules = {
      name: { required: true, kind: 'text' as const },
      website: { required: false, kind: 'url' as const },
    };

    expect(isOnboardingStepValid({ name: 'Glass Houses', website: '' }, rules)).toBe(true);
    expect(isOnboardingStepValid({ name: '', website: '' }, rules)).toBe(false);
    expect(isOnboardingStepValid({ name: 'Glass Houses', website: 'invalid' }, rules)).toBe(false);
  });
});
