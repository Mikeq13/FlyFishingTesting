import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

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
    <View style={{ flex: 1, backgroundColor: 'rgba(5, 18, 28, 0.72)', justifyContent: 'center', padding: 20 }}>
      <View style={{ gap: 12, borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', borderRadius: 20, padding: 16, backgroundColor: 'rgba(245,252,255,0.98)' }}>
        <Text style={{ fontWeight: '800', fontSize: 20, color: '#102a43' }}>
          {isEditing ? 'Experiment updated' : 'Experiment saved'}
        </Text>
        <Text style={{ color: '#334e68' }}>What do you want to do next?</Text>
        <Pressable onPress={onModifyAndContinue} style={{ backgroundColor: '#2a9d8f', padding: 12, borderRadius: 12 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Modify and continue</Text>
        </Pressable>
        <Pressable onPress={onStartFresh} style={{ backgroundColor: '#264653', padding: 12, borderRadius: 12 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Start fresh</Text>
        </Pressable>
        <Pressable onPress={onViewSession} style={{ backgroundColor: '#1d3557', padding: 12, borderRadius: 12 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>View this session</Text>
        </Pressable>
        <Pressable onPress={onGoToInsights} style={{ backgroundColor: '#6c757d', padding: 12, borderRadius: 12 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '700' }}>Go to insights</Text>
        </Pressable>
        <Pressable onPress={onClose} style={{ backgroundColor: '#adb5bd', padding: 12, borderRadius: 12 }}>
          <Text style={{ color: '#102a43', textAlign: 'center', fontWeight: '700' }}>Close</Text>
        </Pressable>
      </View>
    </View>
  </Modal>
);
