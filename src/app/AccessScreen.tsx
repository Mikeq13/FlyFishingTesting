import React from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { ScreenBackground } from '@/components/ScreenBackground';
import { useAppStore } from './store';
import { getEntitlementLabel, hasPremiumAccess } from '@/engine/entitlementEngine';
import { beginAppleSubscriptionPurchase, PREMIUM_MONTHLY_PRICE_LABEL, PREMIUM_TRIAL_LABEL } from '@/billing/storekit';

export const AccessScreen = () => {
  const {
    users,
    currentUser,
    currentEntitlementLabel,
    currentHasPremiumAccess,
    startTrialForUser,
    grantPowerUserAccess,
    markSubscriberAccess,
    clearUserAccess
  } = useAppStore();

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
    Alert.alert('Access updated', label);
  };

  return (
    <ScreenBackground>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled">
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

        {currentUser.role === 'owner' && (
          <View style={{ gap: 10 }}>
            <Text style={{ color: '#f7fdff', fontWeight: '800', fontSize: 20 }}>Owner Controls</Text>
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
