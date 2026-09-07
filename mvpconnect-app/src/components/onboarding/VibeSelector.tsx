import React from 'react';
import { SelectChips, SelectChipsProps } from './SelectChips';
import { VIBE_OPTIONS, VibeCode } from '../../onboarding/taxonomy/vibes';

export interface VibeSelectorProps extends Omit<SelectChipsProps<VibeCode>, 'label' | 'options'> {
  label?: string;
}

export const VibeSelector: React.FC<VibeSelectorProps> = ({
  label = 'VIBES',
  helperText = 'Choose from the approved MVPConnect vibe list.',
  ...props
}) => (
  <SelectChips
    {...props}
    label={label}
    helperText={helperText}
    options={VIBE_OPTIONS}
    variant="expressive"
  />
);
