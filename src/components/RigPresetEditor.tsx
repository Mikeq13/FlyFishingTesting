import React, { useEffect, useMemo, useState } from 'react';
import { TextInput, View } from 'react-native';
import { SectionCard } from '@/components/ui/SectionCard';
import { AppButton } from '@/components/ui/AppButton';
import { SurfaceTone, useTheme } from '@/design/theme';

interface RigPresetEditorProps {
  onSave: (name: string) => Promise<void>;
  tone?: SurfaceTone;
  initialName?: string;
  onNameChange?: (value: string) => void;
  submitLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
}

export const RigPresetEditor = ({
  onSave,
  tone = 'light',
  initialName = '',
  onNameChange,
  submitLabel = 'Save Rig Preset',
  cancelLabel = 'Cancel',
  onCancel
}: RigPresetEditorProps) => {
  const { theme } = useTheme();
  const [name, setName] = useState(initialName);
  const canSave = useMemo(() => !!name.trim(), [name]);

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  return (
    <SectionCard title="Save Rig Preset" subtitle="Capture the current leader, fly count, and tippet setup as a reusable rig." tone={tone}>
      <TextInput
        value={name}
        onChangeText={(value) => {
          setName(value);
          onNameChange?.(value);
        }}
        placeholder="Preset name"
        placeholderTextColor={theme.colors.inputPlaceholder}
        style={{ borderWidth: 1, borderColor: tone === 'modal' ? theme.colors.modalNestedBorder : theme.colors.borderStrong, padding: 12, borderRadius: theme.radius.md, backgroundColor: theme.colors.inputBg, color: theme.colors.inputText }}
      />
      <View style={{ gap: 8 }}>
        <AppButton label={submitLabel} onPress={() => onSave(name.trim())} disabled={!canSave} surfaceTone={tone} />
        {onCancel ? <AppButton label={cancelLabel} onPress={onCancel} variant="ghost" surfaceTone={tone} /> : null}
      </View>
    </SectionCard>
  );
};
