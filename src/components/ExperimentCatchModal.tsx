import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { TroutSpecies } from '@/types/experiment';
import { AppButton } from '@/components/ui/AppButton';
import { ModalSurface } from '@/components/ui/ModalSurface';
import { appTheme } from '@/design/theme';

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
    <ModalSurface
      title={title}
      subtitle="Choose the trout species and optionally add an approximate length so the app can track both catch rate and fish quality."
    >

        <View style={{ gap: 8 }}>
          <Text style={{ color: appTheme.colors.textDark, fontWeight: '700' }}>Species</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {TROUT_SPECIES_OPTIONS.map((species) => (
              <Pressable
                key={species}
                onPress={() => onSelectSpecies(species)}
                style={{
                  backgroundColor: selectedSpecies === species ? appTheme.colors.primary : 'rgba(29,53,87,0.12)',
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: appTheme.radius.md
                }}
              >
                <Text style={{ color: selectedSpecies === species ? 'white' : appTheme.colors.textDark, fontWeight: '700' }}>{species}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={{ color: appTheme.colors.textDark, fontWeight: '700' }}>Length</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {FISH_SIZE_OPTIONS.map((size) => (
              <Pressable
                key={size}
                onPress={() => onSelectSize(size)}
                style={{
                  backgroundColor: selectedSize === size ? appTheme.colors.secondary : 'rgba(29,53,87,0.12)',
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: appTheme.radius.md,
                  minWidth: 58
                }}
              >
                <Text style={{ color: selectedSize === size ? 'white' : appTheme.colors.textDark, textAlign: 'center', fontWeight: '700' }}>{size}"</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <AppButton label="Cancel" onPress={onCancel} variant="neutral" />
          </View>
          <View style={{ flex: 1 }}>
            <AppButton label="Save Catch" onPress={onConfirm} disabled={selectedSpecies === null} variant="tertiary" />
          </View>
        </View>
    </ModalSurface>
  </Modal>
);
