import React from 'react';
import { Text } from 'react-native';
import { ScreenContainer } from '../../../shared/ui/ScreenContainer';
import { SectionCard } from '../../../shared/ui/SectionCard';

export function PostsScreen() {
  return (
    <ScreenContainer>
      <SectionCard title="Posts">
        <Text>Content sharing in communities with reactions, comments, and optional polls.</Text>
      </SectionCard>
      <SectionCard title="Boundary">
        <Text>Posts are not events, pings, or services.</Text>
      </SectionCard>
    </ScreenContainer>
  );
}
