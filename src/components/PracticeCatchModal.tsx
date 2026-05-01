import React from 'react';
import { Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { CatchLengthUnit } from '@/types/activity';
import { AppButton } from '@/components/ui/AppButton';
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

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          padding: theme.spacing.md,
          backgroundColor: theme.colors.overlay
        }}
      >
        <View
          style={{
            gap: theme.spacing.md,
            borderWidth: 1,
            borderColor: theme.colors.modalBorder,
            borderRadius: theme.radius.xl,
            padding: theme.spacing.lg,
            backgroundColor: theme.colors.modalSurface,
            width: '100%',
            maxWidth: 520,
            maxHeight: '92%',
            alignSelf: 'center'
          }}
        >
          <View style={{ gap: theme.spacing.xs }}>
            <Text style={{ fontWeight: '800', fontSize: 20, color: theme.colors.modalText }}>{title}</Text>
            <Text style={{ color: theme.colors.modalTextSoft, lineHeight: 20 }}>
              Save a quick catch now, or choose species and length for richer catch-rate insights later.
            </Text>
          </View>
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ gap: theme.spacing.md, paddingBottom: theme.spacing.lg }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            <SpeciesPicker
              selectedSpecies={selectedSpecies}
              recommendedSpecies={recommendedSpecies}
              recentSpecies={recentSpecies}
              onSelectSpecies={onSelectSpecies}
            />
            {measurementEnabled ? (
              <View style={{ gap: 8 }}>
                <Text style={{ color: theme.colors.modalText, fontWeight: '700' }}>
                  Optional length ({lengthUnit})
                </Text>
                <TextInput
                  value={selectedLength}
                  onChangeText={onSelectLength}
                  keyboardType="decimal-pad"
                  placeholder={`Length in ${lengthUnit}`}
                  placeholderTextColor={theme.colors.inputPlaceholder}
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.modalNestedBorder,
                    padding: 12,
                    borderRadius: theme.radius.md,
                    backgroundColor: theme.colors.inputBg,
                    color: theme.colors.inputText
                  }}
                />
              </View>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <AppButton
                  label="Cancel"
                  onPress={onCancel}
                  variant="neutral"
                  surfaceTone="modal"
                  disabled={isSubmitting}
                />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton
                  label={isSubmitting ? 'Saving...' : 'Save Catch'}
                  onPress={onConfirm}
                  disabled={isSubmitting}
                  surfaceTone="modal"
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};
