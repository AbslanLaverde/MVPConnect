import React from 'react';
import { HomeEmptyState } from './HomeEmptyState';
import { HomeSection } from './HomeSection';

interface AttentionSectionProps {
  children?: React.ReactNode;
}

export const AttentionSection: React.FC<AttentionSectionProps> = ({ children }) => {
  const hasContent = React.Children.count(children) > 0;

  return (
    <HomeSection title="NEEDS YOUR ATTENTION" testID="attention-section">
      {hasContent ? children : (
        <HomeEmptyState
          title="YOU’RE ALL CAUGHT UP"
          body="Nothing needs your attention right now."
        />
      )}
    </HomeSection>
  );
};
