import React from 'react';
import { Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { appTheme } from '@/design/theme';

interface PremiumFeatureGateProps {
  title: string;
  description: string;
}

export const PremiumFeatureGate = ({ title, description }: PremiumFeatureGateProps) => {
  const navigation = useNavigation<any>();

  return (
    <SectionCard title={title} subtitle={description}>
      <Text style={{ color: appTheme.colors.textSoft }}>
        Start a 7-day trial, subscribe for $3.99/month, or grant power-user access from the owner account.
      </Text>
      <AppButton label="Open Settings" onPress={() => navigation.navigate('Access')} />
      <AppButton label="Back Home" onPress={() => navigation.navigate('Home')} variant="secondary" />
    </SectionCard>
  );
};
