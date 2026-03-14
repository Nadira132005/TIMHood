import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { WelcomeScreen } from '../features/welcome/screens/WelcomeScreen';
import { initialSessionState } from '../shared/state/session';
import { colors } from '../shared/theme/tokens';

export function AppShell() {
  const [session, setSession] = useState(initialSessionState);

  return (
    <View style={styles.container}>
      {session.profile ? (
        <WelcomeScreen
          profile={session.profile}
          onLogout={() => setSession(initialSessionState)}
        />
      ) : (
        <LoginScreen
          onLogin={(profile) =>
            setSession({
              userId: profile.userId,
              profile
            })
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg
  }
});
