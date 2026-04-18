import React from 'react';
import { Alert, Text, View } from 'react-native';
import { ActionGroup } from '@/components/ui/ActionGroup';
import { AppButton } from '@/components/ui/AppButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { useTheme } from '@/design/theme';

export const LocalDataSection = ({
  isOwner,
  cleanupActions,
  onDeleteProfile,
  embedded = false
}: {
  isOwner: boolean;
  cleanupActions: React.ReactNode;
  onDeleteProfile: () => Promise<void>;
  embedded?: boolean;
}) => {
  const { theme } = useTheme();

  const content = (
  <>
    <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
      Clean up local fishing data for the active profile without affecting other anglers on this device.
    </Text>
    <ActionGroup>{cleanupActions}</ActionGroup>
    {!isOwner ? (
      <AppButton
        label="Delete My Angler Profile"
        onPress={() => onDeleteProfile().catch((error) => Alert.alert('Unable to delete profile', error instanceof Error ? error.message : 'Please try again.'))}
        variant="danger"
        surfaceTone="light"
      />
    ) : (
      <View style={{ backgroundColor: theme.colors.nestedSurface, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: theme.colors.nestedSurfaceBorder }}>
        <Text style={{ color: theme.colors.textDarkSoft }}>
          The owner profile stays in place, but you can still clear its fishing data when you want a fresh start.
        </Text>
      </View>
    )}
  </>
  );

  if (embedded) {
    return content;
  }

  return (
  <SectionCard title="My Data" subtitle="Manage local fishing data for the active profile without affecting other anglers on this device." tone="light">
    {content}
  </SectionCard>
  );
};
