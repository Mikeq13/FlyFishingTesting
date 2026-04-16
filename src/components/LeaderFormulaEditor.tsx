import React, { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { LeaderFormulaSection } from '@/types/rig';

interface LeaderFormulaEditorProps {
  onSave: (payload: { name: string; sections: LeaderFormulaSection[] }) => Promise<void>;
}

export const LeaderFormulaEditor = ({ onSave }: LeaderFormulaEditorProps) => {
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
    <View style={{ gap: 10, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)', borderRadius: 18, padding: 14, backgroundColor: 'rgba(6, 27, 44, 0.70)' }}>
      <Text style={{ fontWeight: '800', fontSize: 18, color: '#f7fdff' }}>Quick Add Leader Formula</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Formula name"
        placeholderTextColor="#5a6c78"
        style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }}
      />

      {sections.map((section, index) => (
        <View key={`${section.order}-${index}`} style={{ gap: 8, borderRadius: 12, padding: 10, backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Section {index + 1}</Text>
          <TextInput
            value={section.materialLabel}
            onChangeText={(materialLabel) =>
              setSections((current) => current.map((entry, entryIndex) => (entryIndex === index ? { ...entry, materialLabel } : entry)))
            }
            placeholder="Material label"
            placeholderTextColor="#5a6c78"
            style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }}
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
            placeholderTextColor="#5a6c78"
            style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }}
          />
          {sections.length > 1 ? (
            <Pressable
              onPress={() => setSections((current) => current.filter((_, entryIndex) => entryIndex !== index).map((entry, entryIndex) => ({ ...entry, order: entryIndex })))}
              style={{ backgroundColor: 'rgba(91,11,11,0.92)', padding: 10, borderRadius: 10 }}
            >
              <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>Remove Section</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      <Pressable
        onPress={() =>
          setSections((current) => [...current, { order: current.length, materialLabel: '', lengthFeet: 0 }])
        }
        style={{ backgroundColor: '#1d3557', padding: 12, borderRadius: 12 }}
      >
        <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>Add Section</Text>
      </Pressable>

      <Pressable
        onPress={() => onSave({ name: name.trim(), sections: sections.map((section, index) => ({ ...section, order: index })) })}
        disabled={!canSave}
        style={{ backgroundColor: canSave ? '#2a9d8f' : '#6c757d', padding: 12, borderRadius: 12 }}
      >
        <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>Save Leader Formula</Text>
      </Pressable>
    </View>
  );
};
