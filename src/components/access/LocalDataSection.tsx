import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { ActionGroup } from '@/components/ui/ActionGroup';

export const LocalDataSection = ({
  isOwner,
  cleanupActions,
  onDeleteProfile
}: {
  isOwner: boolean;
  cleanupActions: React.ReactNode;
  onDeleteProfile: () => Promise<void>;
}) => (
  <View style={{ gap: 8, backgroundColor: 'rgba(6, 27, 44, 0.72)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
    <Text style={{ color: '#d7f3ff', fontWeight: '700', fontSize: 16 }}>My Data</Text>
    <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>
      Clean up local fishing data for the active profile without affecting other anglers on this device.
    </Text>
    <ActionGroup>{cleanupActions}</ActionGroup>
    {!isOwner ? (
      <Pressable
        onPress={() => onDeleteProfile().catch((error) => Alert.alert('Unable to delete profile', error instanceof Error ? error.message : 'Please try again.'))}
        style={{ backgroundColor: '#5b0b0b', padding: 12, borderRadius: 12 }}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Delete My Angler Profile</Text>
      </Pressable>
    ) : (
      <View style={{ backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 10 }}>
        <Text style={{ color: '#d7f3ff' }}>
          The owner profile stays in place, but you can still clear its fishing data when you want a fresh start.
        </Text>
      </View>
    )}
  </View>
);
