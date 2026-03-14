import React from 'react';
import { Text } from 'react-native';
import { ScreenContainer } from '../../../shared/ui/ScreenContainer';
import { SectionCard } from '../../../shared/ui/SectionCard';

export function ServicesScreen() {
  return (
    <ScreenContainer>
      <SectionCard title="Services">
        <Text>Non-urgent structured requests in one community with applicant selection.</Text>
      </SectionCard>
      <SectionCard title="MVP Rule">
        <Text>Creator selects one helper only.</Text>
      </SectionCard>
    </ScreenContainer>
  );
}
