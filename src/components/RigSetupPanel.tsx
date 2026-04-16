import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { OptionChips } from './OptionChips';
import { LeaderFormula, RigSetup, TippetSize } from '@/types/rig';
import { applyLeaderFormulaToRig } from '@/utils/rigSetup';
import { LeaderFormulaEditor } from './LeaderFormulaEditor';

const TIPPET_SIZES: TippetSize[] = ['5x', '6x', '7x', '8x'];

interface RigSetupPanelProps {
  title: string;
  rigSetup: RigSetup;
  flyCount: number;
  savedLeaderFormulas: LeaderFormula[];
  onChange: (next: RigSetup) => void;
  onCreateLeaderFormula: (payload: { name: string; sections: LeaderFormula['sections'] }) => Promise<LeaderFormula>;
  onDeleteLeaderFormula?: (formulaId: number) => Promise<void>;
}

export const RigSetupPanel = ({
  title,
  rigSetup,
  flyCount,
  savedLeaderFormulas,
  onChange,
  onCreateLeaderFormula,
  onDeleteLeaderFormula
}: RigSetupPanelProps) => {
  const [showFormulaList, setShowFormulaList] = useState(false);
  const [showFormulaEditor, setShowFormulaEditor] = useState(false);
  const sortedFormulas = useMemo(() => [...savedLeaderFormulas].sort((left, right) => left.name.localeCompare(right.name)), [savedLeaderFormulas]);

  return (
    <View style={{ gap: 10, borderWidth: 1, borderColor: 'rgba(202,240,248,0.16)', borderRadius: 18, padding: 14, backgroundColor: 'rgba(6, 27, 44, 0.70)' }}>
      <Text style={{ fontWeight: '800', fontSize: 18, color: '#f7fdff' }}>{title}</Text>
      <OptionChips label="Tippet Size" options={TIPPET_SIZES} value={rigSetup.tippetSize} onChange={(value) => onChange({ ...rigSetup, tippetSize: value as TippetSize })} />

      {!!sortedFormulas.length ? (
        <>
          <Pressable onPress={() => setShowFormulaList((current) => !current)} style={{ backgroundColor: '#1d3557', padding: 12, borderRadius: 12 }}>
            <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>
              {showFormulaList ? 'Hide Saved Leader Formulas' : 'Choose Saved Leader Formula'}
            </Text>
          </Pressable>
          {showFormulaList ? (
            <ScrollView style={{ maxHeight: 180, borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)' }}>
              {sortedFormulas.map((formula) => (
                <View
                  key={formula.id}
                  style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#d8e2eb', gap: 8 }}
                >
                  <Pressable
                    onPress={() => {
                      onChange(applyLeaderFormulaToRig(rigSetup, formula));
                      setShowFormulaList(false);
                    }}
                  >
                    <Text style={{ color: '#0b3d3a', fontWeight: '700' }}>{formula.name}</Text>
                    <Text style={{ color: '#4b5563', fontSize: 12 }}>
                      {formula.sections.map((section) => `${section.lengthFeet} ft ${section.materialLabel}`).join(' | ')}
                    </Text>
                  </Pressable>
                  {onDeleteLeaderFormula ? (
                    <Pressable
                      onPress={() => {
                        onDeleteLeaderFormula(formula.id).catch(console.error);
                        if (rigSetup.leaderFormulaId === formula.id) {
                          onChange(applyLeaderFormulaToRig(rigSetup, null));
                        }
                      }}
                      style={{ backgroundColor: 'rgba(91,11,11,0.92)', padding: 10, borderRadius: 10 }}
                    >
                      <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>Delete Formula</Text>
                    </Pressable>
                  ) : null}
                </View>
              ))}
            </ScrollView>
          ) : null}
        </>
      ) : null}

      <Pressable onPress={() => setShowFormulaEditor((current) => !current)} style={{ backgroundColor: '#264653', padding: 12, borderRadius: 12 }}>
        <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>
          {showFormulaEditor ? 'Hide Leader Formula Builder' : 'Quick Add Leader Formula'}
        </Text>
      </Pressable>

      {showFormulaEditor ? (
        <LeaderFormulaEditor
          onSave={async (payload) => {
            const saved = await onCreateLeaderFormula(payload);
            onChange(applyLeaderFormulaToRig(rigSetup, saved));
            setShowFormulaEditor(false);
          }}
        />
      ) : null}

      <TextInput
        value={rigSetup.totalTippetLengthFeet ? String(rigSetup.totalTippetLengthFeet) : ''}
        onChangeText={(value) => onChange({ ...rigSetup, totalTippetLengthFeet: value ? Number(value) : undefined })}
        placeholder="Total tippet length (feet)"
        keyboardType="decimal-pad"
        placeholderTextColor="#5a6c78"
        style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }}
      />

      {flyCount > 1 ? (
        <TextInput
          value={rigSetup.lengthToFirstDropperInches ? String(rigSetup.lengthToFirstDropperInches) : ''}
          onChangeText={(value) => onChange({ ...rigSetup, lengthToFirstDropperInches: value ? Number(value) : undefined })}
          placeholder="Length to first dropper (inches)"
          keyboardType="decimal-pad"
          placeholderTextColor="#5a6c78"
          style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }}
        />
      ) : null}

      {flyCount > 2 ? (
        <TextInput
          value={rigSetup.firstToSecondDropperInches ? String(rigSetup.firstToSecondDropperInches) : ''}
          onChangeText={(value) => onChange({ ...rigSetup, firstToSecondDropperInches: value ? Number(value) : undefined })}
          placeholder="First to second dropper (inches)"
          keyboardType="decimal-pad"
          placeholderTextColor="#5a6c78"
          style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }}
        />
      ) : null}

      {rigSetup.leaderFormulaName ? (
        <View style={{ gap: 4, borderRadius: 12, padding: 10, backgroundColor: 'rgba(255,255,255,0.08)' }}>
          <Text style={{ color: '#f7fdff', fontWeight: '700' }}>Leader Formula: {rigSetup.leaderFormulaName}</Text>
          <Text style={{ color: '#d7f3ff' }}>
            {rigSetup.leaderFormulaSectionsSnapshot.map((section) => `${section.lengthFeet} ft ${section.materialLabel}`).join(' | ')}
          </Text>
        </View>
      ) : null}
    </View>
  );
};
