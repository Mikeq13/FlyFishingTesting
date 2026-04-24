import React from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { BottomSheetSurface } from '@/components/ui/BottomSheetSurface';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { SectionCard } from '@/components/ui/SectionCard';
import { useTheme } from '@/design/theme';
import { WaterType } from '@/types/session';
import { getWaterTypePlaybookEntry, WATER_TYPE_PLAYBOOK } from '@/utils/waterTypePlaybook';

export const WaterGuideDrawer = ({
  visible,
  waterType,
  onSelectWaterType,
  onClose
}: {
  visible: boolean;
  waterType?: WaterType | null;
  onSelectWaterType?: (waterType: WaterType) => void;
  onClose: () => void;
}) => {
  const { theme } = useTheme();
  const [selectedWaterType, setSelectedWaterType] = React.useState<WaterType>(waterType ?? 'run');

  React.useEffect(() => {
    if (waterType) setSelectedWaterType(waterType);
  }, [waterType]);

  const entry = getWaterTypePlaybookEntry(selectedWaterType);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <BottomSheetSurface
        title="Water Guide"
        subtitle="Fast field guidance for the water in front of you. Start here, then let the journal prove what worked."
        onClose={onClose}
      >
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {Object.values(WATER_TYPE_PLAYBOOK).map((item) => {
              const selected = item.waterType === selectedWaterType;
              return (
                <View key={item.waterType} style={{ minWidth: 96, flexGrow: 1 }}>
                  <AppButton
                    label={item.title}
                    onPress={() => {
                      setSelectedWaterType(item.waterType);
                      onSelectWaterType?.(item.waterType);
                    }}
                    variant={selected ? 'primary' : 'ghost'}
                    surfaceTone="modal"
                  />
                </View>
              );
            })}
          </View>

          <SectionCard title={entry.title} subtitle={entry.beginnerRead} tone="modal">
            <InlineSummaryRow label="Where Fish Hold" value={entry.whereFishHold} tone="modal" />
            <InlineSummaryRow label="Approach" value={entry.recommendedApproach} tone="modal" />
            <InlineSummaryRow label="Flies And Rig" value={entry.flyAndRigNotes} tone="modal" />
            <InlineSummaryRow label="Common Mistake" value={entry.commonMistake} tone="modal" />
            <InlineSummaryRow label="What To Log" value={entry.whatToLog} tone="modal" />
          </SectionCard>

          <Text style={{ color: theme.colors.modalTextSoft, lineHeight: 20 }}>
            This is a starting point, not a guarantee. Fishing Lab gets smarter when you log the water, rig, technique, and catches that actually happened.
          </Text>
          <AppButton label="Done" onPress={onClose} surfaceTone="modal" />
        </ScrollView>
      </BottomSheetSurface>
    </Modal>
  );
};

