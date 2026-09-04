import React from 'react';
import { SelectChips, SelectChipsProps } from './SelectChips';
import { APPROVED_GENRE_TAXONOMY } from './genreTaxonomy';

export interface GenreSelectorProps extends Omit<SelectChipsProps, 'label' | 'options'> {
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
    options={APPROVED_GENRE_TAXONOMY}
  />
);
