import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

interface PremiumFeatureGateProps {
  title: string;
  description: string;
}

export const PremiumFeatureGate = ({ title, description }: PremiumFeatureGateProps) => {
  const navigation = useNavigation<any>();

  return (
    <View
      style={{
        gap: 10,
        backgroundColor: 'rgba(6, 27, 44, 0.78)',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(202,240,248,0.16)'
      }}
    >
      <Text style={{ color: '#f7fdff', fontSize: 24, fontWeight: '800' }}>{title}</Text>
      <Text style={{ color: '#d7f3ff', lineHeight: 22 }}>{description}</Text>
      <Text style={{ color: '#bde6f6' }}>
        Start a 7-day trial, subscribe for $3.99/month, or grant power-user access from the owner account.
      </Text>
      <Pressable onPress={() => navigation.navigate('Access')} style={{ backgroundColor: '#2a9d8f', padding: 14, borderRadius: 14 }}>
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Open Access & Billing</Text>
      </Pressable>
      <Pressable onPress={() => navigation.navigate('Home')} style={{ backgroundColor: '#1d3557', padding: 14, borderRadius: 14 }}>
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Back Home</Text>
      </Pressable>
    </View>
  );
};
