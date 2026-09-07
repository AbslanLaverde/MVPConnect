import React from 'react';
import { SelectChips, SelectChipsProps } from './SelectChips';
import { GENRE_OPTIONS, GenreCode } from '../../onboarding/taxonomy/genres';

export interface GenreSelectorProps extends Omit<SelectChipsProps<GenreCode>, 'label' | 'options'> {
  label?: string;
}

export const GenreSelector: React.FC<GenreSelectorProps> = ({
  label = 'GENRES',
  helperText = 'Choose from the approved MVPConnect genre list.',
  ...props
}) => (
  <SelectChips
    {...props}
    label={label}
    helperText={helperText}
    options={GENRE_OPTIONS}
  />
);
