import React from 'react';
import { SelectChips, SelectChipsProps } from './SelectChips';
import { EVENT_TYPE_OPTIONS, EventTypeCode } from '../../onboarding/taxonomy/eventTypes';

export interface EventTypeSelectorProps
  extends Omit<SelectChipsProps<EventTypeCode>, 'label' | 'options'> {
  label?: string;
}

export const EventTypeSelector: React.FC<EventTypeSelectorProps> = ({
  label = 'EVENT TYPES',
  helperText = 'Choose from the approved MVPConnect event type list.',
  ...props
}) => (
  <SelectChips
    {...props}
    label={label}
    helperText={helperText}
    options={EVENT_TYPE_OPTIONS}
    variant="compact"
  />
);
