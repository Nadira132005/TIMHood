import React from 'react';
import { Text } from 'react-native';
import { ScreenContainer } from '../../../shared/ui/ScreenContainer';
import { SectionCard } from '../../../shared/ui/SectionCard';

export function ProfileScreen() {
  return (
    <ScreenContainer>
      <SectionCard title="Profile">
        <Text>Onboarding answers, visibility controls, and soft social matching.</Text>
      </SectionCard>
      <SectionCard title="Riddles">
        <Text>Daily community and interest riddles are optional feature modules.</Text>
      </SectionCard>
    </ScreenContainer>
  );
}
