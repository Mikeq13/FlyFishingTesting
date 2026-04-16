import React from 'react';
import { Alert, Platform, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';
import { UserDataCleanupCategory, useAppStore } from './store';
import { getEntitlementLabel, hasPremiumAccess } from '@/engine/entitlementEngine';
import { beginAppleSubscriptionPurchase, PREMIUM_MONTHLY_PRICE_LABEL, PREMIUM_TRIAL_LABEL } from '@/billing/storekit';

export const AccessScreen = () => {
  const { width } = useWindowDimensions();
  const {
    users,
    ownerUser,
    currentUser,
    currentEntitlementLabel,
    currentHasPremiumAccess,
    canManageAccess,
    startTrialForUser,
    grantPowerUserAccess,
    markSubscriberAccess,
    clearUserAccess,
    clearFishingDataForUser,
    clearUserDataCategories,
    deleteAngler
  } = useAppStore();
  const contentMaxWidth = Platform.OS === 'web' ? Math.min(width - 24, 980) : undefined;

  if (!currentUser) {
    return (
      <ScreenBackground>
        <View style={{ flex: 1, justifyContent: 'center', padding: 20 }}>
          <Text style={{ color: '#f7fdff', textAlign: 'center' }}>No active user selected.</Text>
        </View>
      </ScreenBackground>
    );
  }

  const handlePurchase = async () => {
    const result = await beginAppleSubscriptionPurchase();
    if (!result.ok) {
      Alert.alert('Apple subscription not ready yet', result.reason);
      return;
    }

    await markSubscriberAccess(currentUser.id);
    Alert.alert('Premium unlocked', result.message);
  };

  const runAdminAction = async (action: () => Promise<void>, label: string) => {
    await action();
    Alert.alert('Action completed', label);
  };

  const confirmAdminAction = (title: string, message: string, action: () => Promise<void>, successLabel: string) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        style: 'destructive',
        onPress: () => {
          runAdminAction(action, successLabel).catch((error) => {
            const reason = error instanceof Error ? error.message : 'Please try again.';
            Alert.alert('Unable to finish action', reason);
          });
        }
      }
    ]);
  };

  const cleanupConfig: Array<{ key: UserDataCleanupCategory; label: string; description: string; destructive?: boolean }> = [
    { key: 'experiments', label: 'Clear Experiments', description: 'Removes experiment results but keeps sessions, saved flies, and saved rivers.' },
    { key: 'sessions', label: 'Clear Sessions', description: 'Removes sessions and their linked experiments, but keeps saved flies and saved rivers.' },
    { key: 'flies', label: 'Clear Saved Flies', description: 'Removes saved flies but keeps sessions, experiments, and saved rivers.' },
    { key: 'formulas', label: 'Clear Leader Formulas', description: 'Removes saved leader formulas but keeps sessions, experiments, flies, and saved rivers.' },
    { key: 'rig_presets', label: 'Clear Rig Presets', description: 'Removes saved rig presets but keeps sessions, experiments, flies, and leader formulas.' },
    { key: 'rivers', label: 'Clear Saved Rivers', description: 'Removes saved rivers but keeps sessions, experiments, and saved flies.' },
    { key: 'all', label: 'Clear Everything', description: 'Removes sessions, experiments, saved flies, saved leader formulas, saved rig presets, and saved rivers for this profile.', destructive: true }
  ];

  const renderCleanupActions = (userId: number, userName: string, tone: 'dark' | 'light') => (
    <View style={{ gap: 8 }}>
      {cleanupConfig.map((item) => (
        <Pressable
          key={`${userId}-${item.key}`}
          onPress={() => {
            if (item.key === 'experiments') {
              Alert.alert(
                'Clear experiments',
                `Choose whether to delete only incomplete draft experiments or remove all experiments for ${userName}. Drafts are unfinished entries you may not need anymore. All experiments removes both draft and completed experiment history.`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete Drafts Only',
                    style: 'destructive',
                    onPress: () => {
                      runAdminAction(
                        () => clearUserDataCategories(userId, ['drafts']),
                        `Draft experiments deleted for ${userName}.`
                      ).catch((error) => {
                        const reason = error instanceof Error ? error.message : 'Please try again.';
                        Alert.alert('Unable to finish action', reason);
                      });
                    }
                  },
                  {
                    text: 'Delete All Experiments',
                    style: 'destructive',
                    onPress: () => {
                      runAdminAction(
                        () => clearUserDataCategories(userId, ['experiments']),
                        `All experiments deleted for ${userName}.`
                      ).catch((error) => {
                        const reason = error instanceof Error ? error.message : 'Please try again.';
                        Alert.alert('Unable to finish action', reason);
                      });
                    }
                  }
                ]
              );
              return;
            }

            confirmAdminAction(
              `${item.label}?`,
              `${item.description} This only affects ${userName} on this device.`,
              () => (item.key === 'all' ? clearFishingDataForUser(userId) : clearUserDataCategories(userId, [item.key])),
              `${item.label.replace('Clear ', '')} finished for ${userName}.`
            );
          }}
          style={{
            backgroundColor:
              tone === 'dark'
                ? item.destructive ? '#6c584c' : 'rgba(255,255,255,0.10)'
                : item.destructive ? '#6c584c' : '#e9f5fb',
            padding: 12,
            borderRadius: 12,
            borderWidth: tone === 'dark' && !item.destructive ? 1 : 0,
            borderColor: 'rgba(202,240,248,0.16)'
          }}
        >
          <Text style={{ color: tone === 'dark' || item.destructive ? 'white' : '#102a43', textAlign: 'center', fontWeight: '700' }}>
            {item.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );

  return (
    <ScreenBackground>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          padding: 16,
          paddingBottom: 40,
          gap: 12,
          width: '100%',
          alignSelf: 'center',
          maxWidth: contentMaxWidth
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 4 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: '#f7fdff' }}>Access & Billing</Text>
          <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>
            Manage premium access, subscription status, and power-user access from one place.
          </Text>
        </View>

        <View style={{ gap: 8, backgroundColor: 'rgba(6, 27, 44, 0.72)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
          <Text style={{ color: '#d7f3ff', fontWeight: '700', fontSize: 16 }}>Current Access</Text>
          <Text style={{ color: '#f7fdff', fontWeight: '800', fontSize: 22 }}>{currentUser.name}</Text>
          <Text style={{ color: '#bde6f6' }}>Status: {currentEntitlementLabel}</Text>
          <Text style={{ color: '#bde6f6' }}>Premium features: {currentHasPremiumAccess ? 'Enabled' : 'Locked'}</Text>
          <Text style={{ color: '#d7f3ff' }}>
            Plan: {PREMIUM_MONTHLY_PRICE_LABEL} with a {PREMIUM_TRIAL_LABEL.toLowerCase()}
          </Text>

          {currentUser.role !== 'owner' && (
            <>
              <Pressable onPress={() => runAdminAction(() => startTrialForUser(currentUser.id), '7-day trial started for this account.')} style={{ backgroundColor: '#2a9d8f', padding: 12, borderRadius: 12 }}>
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Start 7-Day Trial</Text>
              </Pressable>
              <Pressable onPress={handlePurchase} style={{ backgroundColor: '#1d3557', padding: 12, borderRadius: 12 }}>
                <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Continue With Apple Subscription</Text>
              </Pressable>
            </>
          )}
        </View>

        <View style={{ gap: 8, backgroundColor: 'rgba(6, 27, 44, 0.72)', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)' }}>
          <Text style={{ color: '#d7f3ff', fontWeight: '700', fontSize: 16 }}>My Data</Text>
          <Text style={{ color: '#d7f3ff', lineHeight: 20 }}>
            Clean up local fishing data for the active profile without affecting other anglers on this device.
          </Text>
          {renderCleanupActions(currentUser.id, currentUser.name, 'dark')}
          {currentUser.role !== 'owner' ? (
            <Pressable
              onPress={() =>
                confirmAdminAction(
                  'Delete this angler profile?',
                  `This permanently removes ${currentUser.name} and all of their saved fishing data from this device.`,
                  () => deleteAngler(currentUser.id),
                  `${currentUser.name} was deleted from this device.`
                )
              }
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

        {canManageAccess && (
          <View style={{ gap: 10 }}>
            <Text style={{ color: '#f7fdff', fontWeight: '800', fontSize: 20 }}>Owner Controls</Text>
            {ownerUser && (
              <Text style={{ color: '#d7f3ff' }}>
                Admin access is controlled by {ownerUser.name}. You can manage access while testing with any active angler.
              </Text>
            )}
            {users.map((user) => (
              <View
                key={user.id}
                style={{
                  gap: 8,
                  backgroundColor: 'rgba(245,252,255,0.96)',
                  borderRadius: 18,
                  padding: 14,
                  borderWidth: 1,
                  borderColor: 'rgba(202,240,248,0.18)'
                }}
              >
                <Text style={{ color: '#102a43', fontWeight: '800', fontSize: 18 }}>{user.name}</Text>
                <Text style={{ color: '#334e68' }}>Role: {user.role}</Text>
                <Text style={{ color: '#334e68' }}>Access: {getEntitlementLabel(user)}</Text>
                <Text style={{ color: '#334e68' }}>Premium: {hasPremiumAccess(user) ? 'Enabled' : 'Locked'}</Text>

                {user.role === 'owner' ? (
                  <View style={{ backgroundColor: '#e9f5fb', borderRadius: 12, padding: 10 }}>
                    <Text style={{ color: '#102a43', fontWeight: '700' }}>Owner access stays enabled.</Text>
                  </View>
                ) : (
                  <>
                    <Pressable onPress={() => runAdminAction(() => grantPowerUserAccess(user.id), `${user.name} now has power-user access.`)} style={{ backgroundColor: '#2a9d8f', padding: 12, borderRadius: 12 }}>
                      <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Grant Power User</Text>
                    </Pressable>
                    <Pressable onPress={() => runAdminAction(() => startTrialForUser(user.id), `${user.name} now has a 7-day trial.`)} style={{ backgroundColor: '#1d3557', padding: 12, borderRadius: 12 }}>
                      <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Start 7-Day Trial</Text>
                    </Pressable>
                    <Pressable onPress={() => runAdminAction(() => markSubscriberAccess(user.id), `${user.name} is marked as subscribed.`)} style={{ backgroundColor: '#264653', padding: 12, borderRadius: 12 }}>
                      <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Mark Subscriber</Text>
                    </Pressable>
                    <Pressable onPress={() => runAdminAction(() => clearUserAccess(user.id), `${user.name} was reset to free access.`)} style={{ backgroundColor: '#8d0801', padding: 12, borderRadius: 12 }}>
                      <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Reset Access</Text>
                    </Pressable>
                    {renderCleanupActions(user.id, user.name, 'light')}
                    <Pressable
                      onPress={() =>
                        confirmAdminAction(
                          'Delete angler?',
                          `This permanently removes ${user.name} and all of their saved fishing data from this device.`,
                          () => deleteAngler(user.id),
                          `${user.name} was deleted from this device.`
                        )
                      }
                      style={{ backgroundColor: '#5b0b0b', padding: 12, borderRadius: 12 }}
                    >
                      <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Delete Angler</Text>
                    </Pressable>
                  </>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenBackground>
  );
};
