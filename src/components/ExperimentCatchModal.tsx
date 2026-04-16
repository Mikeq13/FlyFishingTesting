import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { TroutSpecies } from '@/types/experiment';

const TROUT_SPECIES_OPTIONS: TroutSpecies[] = ['Brook', 'Brown', 'Cutthroat', 'Rainbow', 'Tiger', 'Whitefish'];
const FISH_SIZE_OPTIONS = Array.from({ length: 17 }, (_, index) => index + 8);

interface ExperimentCatchModalProps {
  visible: boolean;
  title: string;
  selectedSpecies: TroutSpecies | null;
  selectedSize: number | null;
  onSelectSpecies: (species: TroutSpecies) => void;
  onSelectSize: (size: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ExperimentCatchModal = ({
  visible,
  title,
  selectedSpecies,
  selectedSize,
  onSelectSpecies,
  onSelectSize,
  onCancel,
  onConfirm
}: ExperimentCatchModalProps) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
    <View style={{ flex: 1, backgroundColor: 'rgba(5, 18, 28, 0.72)', justifyContent: 'center', padding: 20 }}>
      <View style={{ gap: 12, borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', borderRadius: 20, padding: 16, backgroundColor: 'rgba(245,252,255,0.98)' }}>
        <Text style={{ fontWeight: '800', fontSize: 20, color: '#102a43' }}>{title}</Text>
        <Text style={{ color: '#334e68' }}>
          Choose the trout species and approximate length so the app can track both catch rate and fish quality.
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

        <View style={{ gap: 8 }}>
          <Text style={{ color: '#102a43', fontWeight: '700' }}>Length</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {FISH_SIZE_OPTIONS.map((size) => (
              <Pressable
                key={size}
                onPress={() => onSelectSize(size)}
                style={{
                  backgroundColor: selectedSize === size ? '#1d3557' : 'rgba(29,53,87,0.12)',
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: 12,
                  minWidth: 58
                }}
              >
                <Text style={{ color: selectedSize === size ? 'white' : '#102a43', textAlign: 'center', fontWeight: '700' }}>{size}"</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={onCancel} style={{ backgroundColor: '#6c757d', padding: 12, borderRadius: 12, flex: 1 }}>
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={onConfirm}
            disabled={selectedSize === null || selectedSpecies === null}
            style={{ backgroundColor: selectedSize !== null && selectedSpecies !== null ? '#264653' : '#adb5bd', padding: 12, borderRadius: 12, flex: 1 }}
          >
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Save Catch</Text>
          </Pressable>
        </View>
      </View>
    </View>
  </Modal>
);
