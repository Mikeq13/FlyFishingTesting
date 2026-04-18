import React, { useMemo, useState } from 'react';
import { TextInput } from 'react-native';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { useTheme } from '@/design/theme';

interface RigPresetEditorProps {
  onSave: (name: string) => Promise<void>;
}

export const RigPresetEditor = ({ onSave }: RigPresetEditorProps) => {
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const canSave = useMemo(() => !!name.trim(), [name]);

  return (
    <SectionCard title="Save Rig Preset" subtitle="Capture the current leader, fly count, and tippet setup as a reusable rig." tone="light">
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Preset name"
        placeholderTextColor={theme.colors.inputPlaceholder}
        style={{ borderWidth: 1, borderColor: theme.colors.borderStrong, padding: 12, borderRadius: theme.radius.md, backgroundColor: theme.colors.inputBg, color: theme.colors.textDark }}
      />
      <AppButton label="Save Rig Preset" onPress={() => onSave(name.trim())} disabled={!canSave} surfaceTone="light" />
    </SectionCard>
  );
};
