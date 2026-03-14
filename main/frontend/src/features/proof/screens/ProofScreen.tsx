import React from 'react';
import { Text } from 'react-native';
import { ScreenContainer } from '../../../shared/ui/ScreenContainer';
import { SectionCard } from '../../../shared/ui/SectionCard';

export function ProofScreen() {
  return (
    <ScreenContainer>
      <SectionCard title="Document Number Proof">
        <Text>Submit document number once to unlock verified-only actions.</Text>
      </SectionCard>
      <SectionCard title="Rule">
        <Text>Proof submission is one-time and cannot be repeated after success.</Text>
      </SectionCard>
      <SectionCard title="Locations">
        <Text>Save home pin (required) and work pin (optional) for restricted communities.</Text>
      </SectionCard>
    </ScreenContainer>
  );
}
