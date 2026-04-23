import React from 'react';
import { Modal, ScrollView, Text, View } from 'react-native';
import { HANDS_FREE_EXAMPLES, SUPPORTED_TECHNIQUES, SUPPORTED_WATER_TYPES } from '@/utils/handsFree';
import { useTheme } from '@/design/theme';
import { ModalSurface } from '@/components/ui/ModalSurface';
import { AppButton } from '@/components/ui/AppButton';

export const DictationHelpModal = ({
  visible,
  onClose
}: {
  visible: boolean;
  onClose: () => void;
}) => {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <ModalSurface
        title="Hands-Free Dictation"
        subtitle="Use Siri phrases that map cleanly onto the current outing so voice logging stays predictable on the water."
      >
        <ScrollView contentContainerStyle={{ gap: 12 }}>
          <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
            Fishing Lab keeps the vocabulary intentionally small so voice commands stay reliable when you are moving, wet, or wearing gloves.
          </Text>
          {HANDS_FREE_EXAMPLES.map((example) => (
            <View
              key={example.title}
              style={{
                gap: 4,
                padding: 12,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.nestedSurface,
                borderWidth: 1,
                borderColor: theme.colors.nestedSurfaceBorder
              }}
            >
              <Text style={{ color: theme.colors.textDark, fontWeight: '800' }}>{example.title}</Text>
              <Text style={{ color: theme.colors.textDarkSoft, fontStyle: 'italic' }}>{example.phrase}</Text>
              <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 19 }}>{example.description}</Text>
            </View>
          ))}
          <Text style={{ color: theme.colors.textDark, fontWeight: '800' }}>
            Supported water types: {SUPPORTED_WATER_TYPES.join(', ')}
          </Text>
          <Text style={{ color: theme.colors.textDark, fontWeight: '800' }}>
            Supported techniques: {SUPPORTED_TECHNIQUES.join(', ')}
          </Text>
          <AppButton label="Done" onPress={onClose} />
        </ScrollView>
      </ModalSurface>
    </Modal>
  );
};
