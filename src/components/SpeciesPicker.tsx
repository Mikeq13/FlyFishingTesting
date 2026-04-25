import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useTheme } from '@/design/theme';
import { buildSpeciesOptions, normalizeSpeciesName } from '@/utils/fishSpecies';

export const SpeciesPicker = ({
  selectedSpecies,
  recommendedSpecies,
  recentSpecies = [],
  onSelectSpecies,
  tone = 'modal'
}: {
  selectedSpecies: string | null;
  recommendedSpecies: string[];
  recentSpecies?: string[];
  onSelectSpecies: (species: string) => void;
  tone?: 'modal' | 'light' | 'dark';
}) => {
  const { theme } = useTheme();
  const [customSpecies, setCustomSpecies] = React.useState('');
  const options = buildSpeciesOptions({ recommended: recommendedSpecies, recent: recentSpecies, selected: selectedSpecies });
  const labelColor = tone === 'modal' ? theme.colors.modalText : tone === 'light' ? theme.colors.textDark : theme.colors.text;
  const softColor = tone === 'modal' ? theme.colors.modalTextSoft : tone === 'light' ? theme.colors.textDarkSoft : theme.colors.textSoft;

  const commitCustomSpecies = () => {
    const normalized = normalizeSpeciesName(customSpecies);
    if (!normalized) return;
    onSelectSpecies(normalized);
    setCustomSpecies('');
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={{ gap: 5 }}>
        <Text style={{ color: labelColor, fontWeight: '800' }}>Species</Text>
        <Text style={{ color: softColor, lineHeight: 18 }}>Pick a recent or common species, or add one when this catch is different.</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {options.map((species) => {
          const selected = selectedSpecies?.toLowerCase() === species.toLowerCase();
          return (
            <Pressable
              key={species}
              onPress={() => onSelectSpecies(species)}
              style={{
                backgroundColor: selected ? theme.colors.primary : theme.colors.modalSurfaceAlt,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: selected ? theme.colors.modalBorder : theme.colors.modalNestedBorder
              }}
            >
              <Text style={{ color: selected ? theme.colors.buttonText : theme.colors.modalText, fontWeight: '700' }}>{species}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput
          value={customSpecies}
          onChangeText={setCustomSpecies}
          onSubmitEditing={commitCustomSpecies}
          placeholder="Add species"
          placeholderTextColor={theme.colors.inputPlaceholder}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: theme.colors.modalNestedBorder,
            padding: 12,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.inputBg,
            color: theme.colors.inputText
          }}
        />
        <View style={{ minWidth: 92 }}>
          <Pressable
            onPress={commitCustomSpecies}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 46,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.secondary,
              paddingHorizontal: 12
            }}
          >
            <Text style={{ color: theme.colors.buttonText, fontWeight: '800' }}>Add</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};
