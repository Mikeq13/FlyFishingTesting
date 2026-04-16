import React from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { TroutSpecies } from '@/types/experiment';
import { CatchLengthUnit } from '@/types/activity';

const TROUT_SPECIES_OPTIONS: TroutSpecies[] = ['Brook', 'Brown', 'Cutthroat', 'Rainbow', 'Tiger', 'Whitefish'];

interface PracticeCatchModalProps {
  visible: boolean;
  title: string;
  selectedSpecies: TroutSpecies | null;
  measurementEnabled?: boolean;
  lengthUnit?: CatchLengthUnit;
  selectedLength?: string;
  onSelectSpecies: (species: TroutSpecies) => void;
  onSelectLength?: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export const PracticeCatchModal = ({
  visible,
  title,
  selectedSpecies,
  measurementEnabled = false,
  lengthUnit = 'in',
  selectedLength = '',
  onSelectSpecies,
  onSelectLength,
  onCancel,
  onConfirm
}: PracticeCatchModalProps) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={{ flex: 1, backgroundColor: 'rgba(5, 18, 28, 0.72)', justifyContent: 'center', padding: 20 }}>
      <View style={{ gap: 12, borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', borderRadius: 20, padding: 16, backgroundColor: 'rgba(245,252,255,0.98)' }}>
        <Text style={{ fontWeight: '800', fontSize: 20, color: '#102a43' }}>{title}</Text>
        <Text style={{ color: '#334e68' }}>
          Choose the trout species. The app will timestamp the catch automatically for catch-rate insights later.
        </Text>
        <View style={{ gap: 8 }}>
          <Text style={{ color: '#102a43', fontWeight: '700' }}>Species</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TROUT_SPECIES_OPTIONS.map((species) => (
              <Pressable
                key={species}
                onPress={() => onSelectSpecies(species)}
                style={{
                  backgroundColor: selectedSpecies === species ? '#2a9d8f' : 'rgba(29,53,87,0.12)',
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 12
                }}
              >
                <Text style={{ color: selectedSpecies === species ? 'white' : '#102a43', fontWeight: '700' }}>{species}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {measurementEnabled ? (
          <View style={{ gap: 8 }}>
            <Text style={{ color: '#102a43', fontWeight: '700' }}>Optional length ({lengthUnit})</Text>
            <TextInput
              value={selectedLength}
              onChangeText={onSelectLength}
              keyboardType="decimal-pad"
              placeholder={`Length in ${lengthUnit}`}
              placeholderTextColor="#5a6c78"
              style={{ borderWidth: 1, borderColor: '#cbd5e1', padding: 12, borderRadius: 12, backgroundColor: 'white', color: '#102a43' }}
            />
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={onCancel} style={{ backgroundColor: '#6c757d', padding: 12, borderRadius: 12, flex: 1 }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            disabled={selectedSpecies === null}
            style={{ backgroundColor: selectedSpecies ? '#264653' : '#adb5bd', padding: 12, borderRadius: 12, flex: 1 }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Save Catch</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
);
