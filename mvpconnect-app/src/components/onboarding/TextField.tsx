import React from 'react';
import { Input, InputProps } from '../Input';

export type TextFieldProps = InputProps;

export const TextField: React.FC<TextFieldProps> = ({ brandTypography = true, ...props }) => (
  <Input brandTypography={brandTypography} {...props} />
);
