import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

interface RigPresetEditorProps {
  onSave: (name: string) => Promise<void>;
}

export const RigPresetEditor = ({ onSave }: RigPresetEditorProps) => {
  const [name, setName] = useState('');
  const canSave = useMemo(() => !!name.trim(), [name]);

  return (
    <View style={{ gap: 10, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)', borderRadius: 18, padding: 14, backgroundColor: 'rgba(6, 27, 44, 0.70)' }}>
      <Text style={{ fontWeight: '800', fontSize: 18, color: '#f7fdff' }}>Save Rig Preset</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Preset name"
        placeholderTextColor="#5a6c78"
        style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }}
      />
      <Pressable
        onPress={() => onSave(name.trim())}
        disabled={!canSave}
        style={{ backgroundColor: canSave ? '#2a9d8f' : '#6c757d', padding: 12, borderRadius: 12 }}
      >
        <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>Save Rig Preset</Text>
      </Pressable>
    </View>
  );
};
