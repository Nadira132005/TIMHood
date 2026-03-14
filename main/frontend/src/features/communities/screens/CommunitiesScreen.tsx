import React from 'react';
import { Text } from 'react-native';
import { ScreenContainer } from '../../../shared/ui/ScreenContainer';
import { SectionCard } from '../../../shared/ui/SectionCard';

export function CommunitiesScreen() {
  return (
    <ScreenContainer>
      <SectionCard title="Communities">
        <Text>Open or restricted communities, waiting room, and moderation settings.</Text>
      </SectionCard>
      <SectionCard title="Scaffold Focus">
        <Text>Implement membership states, invites, and access-policy awareness.</Text>
      </SectionCard>
    </ScreenContainer>
  );
}
