import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { CatchLengthUnit } from '@/types/activity';
import { AppButton } from '@/components/ui/AppButton';
import { ModalSurface } from '@/components/ui/ModalSurface';
import { useTheme } from '@/design/theme';
import { SpeciesPicker } from '@/components/SpeciesPicker';
import { FLY_SPECIES_OPTIONS } from '@/utils/fishSpecies';

interface PracticeCatchModalProps {
  visible: boolean;
  title: string;
  selectedSpecies: string | null;
  recommendedSpecies?: string[];
  recentSpecies?: string[];
  measurementEnabled?: boolean;
  lengthUnit?: CatchLengthUnit;
  selectedLength?: string;
  isSubmitting?: boolean;
  onSelectSpecies: (species: string) => void;
  onSelectLength?: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export const PracticeCatchModal = ({
  visible,
  title,
  selectedSpecies,
  recommendedSpecies = FLY_SPECIES_OPTIONS,
  recentSpecies = [],
  measurementEnabled = false,
  lengthUnit = 'in',
  selectedLength = '',
  isSubmitting = false,
  onSelectSpecies,
  onSelectLength,
  onCancel,
  onConfirm
}: PracticeCatchModalProps) => {
  const { theme } = useTheme();

  return (
    <ModalSurface
      visible={visible}
      title={title}
      subtitle="Choose the species. The app will timestamp the catch automatically for catch-rate insights later."
      onClose={onCancel}
    >
        <SpeciesPicker
          selectedSpecies={selectedSpecies}
          recommendedSpecies={recommendedSpecies}
          recentSpecies={recentSpecies}
          onSelectSpecies={onSelectSpecies}
        />
        {measurementEnabled ? (
          <View style={{ gap: 8 }}>
            <Text style={{ color: theme.colors.modalText, fontWeight: '700' }}>Optional length ({lengthUnit})</Text>
            <TextInput
              value={selectedLength}
              onChangeText={onSelectLength}
              keyboardType="decimal-pad"
              placeholder={`Length in ${lengthUnit}`}
              placeholderTextColor={theme.colors.inputPlaceholder}
              style={{ borderWidth: 1, borderColor: theme.colors.modalNestedBorder, padding: 12, borderRadius: theme.radius.md, backgroundColor: theme.colors.inputBg, color: theme.colors.inputText }}
            />
          </View>
        ) : null}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <AppButton label="Cancel" onPress={onCancel} variant="neutral" surfaceTone="modal" disabled={isSubmitting} />
          </View>
          <View style={{ flex: 1 }}>
            <AppButton label={isSubmitting ? 'Saving...' : 'Save Catch'} onPress={onConfirm} disabled={selectedSpecies === null || isSubmitting} surfaceTone="modal" />
          </View>
        </View>
    </ModalSurface>
  );
};
