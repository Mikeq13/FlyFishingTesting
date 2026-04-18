import React, { useMemo, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { LeaderFormulaSection } from '@/types/rig';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { useTheme } from '@/design/theme';

interface LeaderFormulaEditorProps {
  onSave: (payload: { name: string; sections: LeaderFormulaSection[] }) => Promise<void>;
}

export const LeaderFormulaEditor = ({ onSave }: LeaderFormulaEditorProps) => {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [sections, setSections] = useState<LeaderFormulaSection[]>([
    { order: 0, materialLabel: '5x mono', lengthFeet: 15 }
  ]);

  const canSave = useMemo(
    () =>
      !!name.trim() &&
      sections.every((section) => section.materialLabel.trim().length > 0 && Number.isFinite(section.lengthFeet) && section.lengthFeet > 0),
    [name, sections]
  );

  return (
    <SectionCard title="Save Leader" subtitle="Save the mono formula from fly line to tippet ring without leaving the current flow." tone="light">
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Leader name"
        placeholderTextColor={theme.colors.inputPlaceholder}
        style={{ borderWidth: 1, borderColor: theme.colors.borderStrong, padding: 12, borderRadius: theme.radius.md, backgroundColor: theme.colors.inputBg, color: theme.colors.textDark }}
      />

      {sections.map((section, index) => (
        <View
          key={`${section.order}-${index}`}
          style={{
            gap: 8,
            borderRadius: theme.radius.md,
            padding: 10,
            backgroundColor: theme.colors.nestedSurface,
            borderWidth: 1,
            borderColor: theme.colors.nestedSurfaceBorder
          }}
        >
          <Text style={{ color: theme.colors.textDark, fontWeight: '700' }}>Section {index + 1}</Text>
          <TextInput
            value={section.materialLabel}
            onChangeText={(materialLabel) =>
              setSections((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, materialLabel } : entry)))
            }
            placeholder="Material label"
            placeholderTextColor={theme.colors.inputPlaceholder}
            style={{ borderWidth: 1, borderColor: theme.colors.borderStrong, padding: 12, borderRadius: theme.radius.md, backgroundColor: theme.colors.inputBg, color: theme.colors.textDark }}
          />
          <TextInput
            value={String(section.lengthFeet)}
            onChangeText={(value) =>
              setSections((current) =>
                current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, lengthFeet: Number(value || '0') } : entry))
              )
            }
            placeholder="Length in feet"
            keyboardType="decimal-pad"
            placeholderTextColor={theme.colors.inputPlaceholder}
            style={{ borderWidth: 1, borderColor: theme.colors.borderStrong, padding: 12, borderRadius: theme.radius.md, backgroundColor: theme.colors.inputBg, color: theme.colors.textDark }}
          />
          {sections.length > 1 ? (
            <AppButton
              label="Remove Section"
              onPress={() => setSections((current) => current.filter((_, entryIndex) => entryIndex !== index).map((entry, entryIndex) => ({ ...entry, order: entryIndex })))}
              variant="danger"
            />
          ) : null}
        </View>
      ))}

      <AppButton
        label="Add Section"
        onPress={() =>
          setSections((current) => [...current, { order: current.length, materialLabel: '', lengthFeet: 0 }])
        }
        variant="secondary"
      />

      <AppButton
        label="Save Leader"
        onPress={() => onSave({ name: name.trim(), sections: sections.map((section, index) => ({ ...section, order: index })) })}
        disabled={!canSave}
      />
    </SectionCard>
  );
};
