import React from 'react';
import { Modal, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { ModalSurface } from '@/components/ui/ModalSurface';

interface ExperimentSavedActionsModalProps {
  visible: boolean;
  isEditing: boolean;
  onModifyAndContinue: () => void;
  onStartFresh: () => void;
  onViewSession: () => void;
  onGoToInsights: () => void;
  onClose: () => void;
}

export const ExperimentSavedActionsModal = ({
  visible,
  isEditing,
  onModifyAndContinue,
  onStartFresh,
  onViewSession,
  onGoToInsights,
  onClose
}: ExperimentSavedActionsModalProps) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <ModalSurface
      title={isEditing ? 'Experiment updated' : 'Experiment saved'}
      subtitle="What do you want to do next?"
    >
      <View style={{ gap: 8 }}>
        <AppButton label="Modify and continue" onPress={onModifyAndContinue} variant="primary" />
        <AppButton label="Start fresh" onPress={onStartFresh} variant="secondary" />
        <AppButton label="View this session" onPress={onViewSession} variant="tertiary" />
        <AppButton label="Go to insights" onPress={onGoToInsights} variant="ghost" />
        <AppButton label="Close" onPress={onClose} variant="neutral" />
      </View>
    </ModalSurface>
  </Modal>
);
