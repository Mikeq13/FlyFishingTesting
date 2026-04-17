import React, { useMemo, useState } from 'react';
import { TextInput } from 'react-native';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { appTheme } from '@/design/theme';

interface RigPresetEditorProps {
  onSave: (name: string) => Promise<void>;
}

export const RigPresetEditor = ({ onSave }: RigPresetEditorProps) => {
  const [name, setName] = useState('');
  const canSave = useMemo(() => !!name.trim(), [name]);

  return (
    <SectionCard title="Save Rig Preset" subtitle="Capture the current leader, fly count, and tippet setup as a reusable rig.">
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Preset name"
        placeholderTextColor="#5a6c78"
        style={{ borderWidth: 1, borderColor: appTheme.colors.borderStrong, padding: 12, borderRadius: appTheme.radius.md, backgroundColor: appTheme.colors.inputBg, color: appTheme.colors.textDark }}
      />
      <AppButton label="Save Rig Preset" onPress={() => onSave(name.trim())} disabled={!canSave} />
    </SectionCard>
  );
};
