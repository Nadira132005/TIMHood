import React from 'react';
import { Text } from 'react-native';
import { ScreenContainer } from '../../../shared/ui/ScreenContainer';
import { SectionCard } from '../../../shared/ui/SectionCard';

export function EventsScreen() {
  return (
    <ScreenContainer>
      <SectionCard title="Events">
        <Text>Event origin community, share approvals, and moderated participation requests.</Text>
      </SectionCard>
      <SectionCard title="Rule">
        <Text>Users request to participate; they never join directly.</Text>
      </SectionCard>
    </ScreenContainer>
  );
}
