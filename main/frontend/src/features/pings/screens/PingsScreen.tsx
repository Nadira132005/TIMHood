import React from 'react';
import { Text } from 'react-native';
import { ScreenContainer } from '../../../shared/ui/ScreenContainer';
import { SectionCard } from '../../../shared/ui/SectionCard';

export function PingsScreen() {
  return (
    <ScreenContainer>
      <SectionCard title="Pings">
        <Text>Urgent short-lived requests with WILL HELP responses and visible count.</Text>
      </SectionCard>
      <SectionCard title="Rule">
        <Text>Pings only in enabled communities and by verified users.</Text>
      </SectionCard>
    </ScreenContainer>
  );
}
