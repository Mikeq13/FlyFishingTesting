import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { ModalSurface } from '@/components/ui/ModalSurface';
import { useTheme } from '@/design/theme';
import { SpeciesPicker } from '@/components/SpeciesPicker';
import { FLY_SPECIES_OPTIONS } from '@/utils/fishSpecies';

const FISH_SIZE_OPTIONS = Array.from({ length: 17 }, (_, index) => index + 8);

interface ExperimentCatchModalProps {
  visible: boolean;
  title: string;
  selectedSpecies: string | null;
  recommendedSpecies?: string[];
  recentSpecies?: string[];
  selectedSize: number | null;
  onSelectSpecies: (species: string) => void;
  onSelectSize: (size: number) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export const ExperimentCatchModal = ({
  visible,
  title,
  selectedSpecies,
  recommendedSpecies = FLY_SPECIES_OPTIONS,
  recentSpecies = [],
  selectedSize,
  onSelectSpecies,
  onSelectSize,
  onCancel,
  onConfirm
}: ExperimentCatchModalProps) => {
  const { theme } = useTheme();

  return (
    <ModalSurface
      visible={visible}
      title={title}
      subtitle="Save a quick catch now, or choose species and length for richer experiment results later."
      onClose={onCancel}
    >

        <SpeciesPicker
          selectedSpecies={selectedSpecies}
          recommendedSpecies={recommendedSpecies}
          recentSpecies={recentSpecies}
          onSelectSpecies={onSelectSpecies}
        />

        <View style={{ gap: 8 }}>
          <Text style={{ color: theme.colors.modalText, fontWeight: '700' }}>Length</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {FISH_SIZE_OPTIONS.map((size) => (
              <Pressable
                key={size}
                onPress={() => onSelectSize(size)}
                style={{
                  backgroundColor: selectedSize === size ? theme.colors.secondary : theme.colors.modalSurfaceAlt,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  borderRadius: theme.radius.md,
                  minWidth: 58
                }}
              >
                <Text style={{ color: selectedSize === size ? theme.colors.buttonText : theme.colors.modalText, textAlign: 'center', fontWeight: '700' }}>{size}"</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <AppButton label="Cancel" onPress={onCancel} variant="neutral" surfaceTone="modal" />
          </View>
          <View style={{ flex: 1 }}>
            <AppButton label="Save Catch" onPress={onConfirm} surfaceTone="modal" />
          </View>
        </View>
    </ModalSurface>
  );
};
