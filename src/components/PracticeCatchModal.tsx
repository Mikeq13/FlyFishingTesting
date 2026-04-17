import React from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { TroutSpecies } from '@/types/experiment';
import { CatchLengthUnit } from '@/types/activity';
import { AppButton } from '@/components/ui/AppButton';
import { ModalSurface } from '@/components/ui/ModalSurface';
import { appTheme } from '@/design/theme';

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
    <ModalSurface
      title={title}
      subtitle="Choose the trout species. The app will timestamp the catch automatically for catch-rate insights later."
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
        {measurementEnabled ? (
          <View style={{ gap: 8 }}>
            <Text style={{ color: appTheme.colors.textDark, fontWeight: '700' }}>Optional length ({lengthUnit})</Text>
            <TextInput
              value={selectedLength}
              onChangeText={onSelectLength}
              keyboardType="decimal-pad"
              placeholder={`Length in ${lengthUnit}`}
              placeholderTextColor="#5a6c78"
              style={{ borderWidth: 1, borderColor: appTheme.colors.borderStrong, padding: 12, borderRadius: appTheme.radius.md, backgroundColor: 'white', color: appTheme.colors.textDark }}
            />
          </View>
        ) : null}
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
