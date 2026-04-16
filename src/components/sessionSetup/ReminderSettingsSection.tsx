import React from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { OptionChips } from '@/components/OptionChips';
import { SESSION_ALERT_MARKERS } from '@/constants/options';
import { SessionMode } from '@/types/session';
import { isReminderMarkerAllowed } from '@/utils/sessionReminders';

interface ReminderSettingsSectionProps {
  mode: SessionMode;
  durationHours: string;
  onDurationHoursChange: (value: string) => void;
  durationMinutes: string;
  onDurationMinutesChange: (value: string) => void;
  plannedDurationMinutes?: number;
  plannedEndLabel: string | null;
  alertMarkersMinutes: number[];
  onAlertMarkersChange: React.Dispatch<React.SetStateAction<number[]>>;
  customAlertMinute: string;
  onCustomAlertMinuteChange: (value: string) => void;
  customAlertError: string;
  reminderValidationMessage: string | null;
  onAddCustomAlertMarker: () => void;
  notificationSoundEnabled: boolean;
  onNotificationSoundEnabledChange: (value: boolean) => void;
  notificationVibrationEnabled: boolean;
  onNotificationVibrationEnabledChange: (value: boolean) => void;
}

export const ReminderSettingsSection = ({
  mode,
  durationHours,
  onDurationHoursChange,
  durationMinutes,
  onDurationMinutesChange,
  plannedDurationMinutes,
  plannedEndLabel,
  alertMarkersMinutes,
  onAlertMarkersChange,
  customAlertMinute,
  onCustomAlertMinuteChange,
  customAlertError,
  reminderValidationMessage,
  onAddCustomAlertMarker,
  notificationSoundEnabled,
  onNotificationSoundEnabledChange,
  notificationVibrationEnabled,
  onNotificationVibrationEnabledChange
}: ReminderSettingsSectionProps) => (
  <>
    <Text style={{ color: '#d7f3ff', fontWeight: '700', fontSize: 16 }}>Session Timer</Text>
    <Text style={{ color: '#bde6f6', lineHeight: 20 }}>
      {mode === 'competition'
        ? 'Competition reminders follow the absolute start and end times above.'
        : 'Set the total time you plan to fish in this session. Reminder markers fire based on elapsed time from when you begin.'}
    </Text>
    {mode === 'practice' ? (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Hours</Text>
          <TextInput value={durationHours} onChangeText={onDurationHoursChange} placeholder="0" keyboardType="number-pad" placeholderTextColor="#5a6c78" style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }} />
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Minutes</Text>
          <TextInput value={durationMinutes} onChangeText={onDurationMinutesChange} placeholder="0" keyboardType="number-pad" placeholderTextColor="#5a6c78" style={{ borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }} />
        </View>
      </View>
    ) : null}
    {plannedEndLabel ? <Text style={{ color: '#bde6f6' }}>If you begin now, your planned end time is {plannedEndLabel}.</Text> : null}
    <View style={{ gap: 8 }}>
      <Text style={{ color: '#d7f3ff', fontWeight: '700' }}>Reminder Markers</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SESSION_ALERT_MARKERS.map((minute) => {
          const selected = alertMarkersMinutes.includes(minute);
          const disabled = !selected && !isReminderMarkerAllowed(minute, plannedDurationMinutes);
          return (
            <Pressable
              key={minute}
              onPress={() => {
                if (disabled) return;
                onAlertMarkersChange((current) =>
                  current.includes(minute)
                    ? current.filter((value) => value !== minute)
                    : [...current, minute].sort((left, right) => left - right)
                );
              }}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: selected ? '#84d9f4' : disabled ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.22)',
                backgroundColor: selected ? 'rgba(132,217,244,0.28)' : disabled ? 'rgba(6,28,41,0.24)' : 'rgba(6,28,41,0.5)',
                opacity: disabled ? 0.45 : 1
              }}
            >
              <Text style={{ color: '#f4fbff', fontWeight: '700' }}>{minute} min</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput value={customAlertMinute} onChangeText={onCustomAlertMinuteChange} placeholder="Custom minute" keyboardType="number-pad" placeholderTextColor="#5a6c78" style={{ flex: 1, borderWidth: 1, borderColor: 'rgba(202,240,248,0.18)', padding: 12, borderRadius: 12, backgroundColor: 'rgba(245,252,255,0.96)', color: '#102a43' }} />
        <Pressable onPress={onAddCustomAlertMarker} style={{ backgroundColor: '#1d3557', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, justifyContent: 'center' }}>
          <Text style={{ color: '#f7fdff', fontWeight: '700' }}>Add</Text>
        </Pressable>
      </View>
      {customAlertError ? <Text style={{ color: '#fca5a5' }}>{customAlertError}</Text> : null}
      {reminderValidationMessage ? <Text style={{ color: '#fca5a5' }}>{reminderValidationMessage}</Text> : null}
      {!!alertMarkersMinutes.length ? <Text style={{ color: '#bde6f6' }}>Active reminders: {alertMarkersMinutes.map((minute) => `${minute} min`).join(', ')}</Text> : <Text style={{ color: '#bde6f6' }}>No reminders selected. You can use presets or add custom minute markers for your beat.</Text>}
      <Pressable onPress={() => onAlertMarkersChange([])} style={{ backgroundColor: 'rgba(255,255,255,0.1)', padding: 10, borderRadius: 12 }}>
        <Text style={{ color: '#f7fdff', textAlign: 'center', fontWeight: '700' }}>Turn Off Reminders</Text>
      </Pressable>
      <OptionChips label="Notification Sound" options={['On', 'Off'] as const} value={notificationSoundEnabled ? 'On' : 'Off'} onChange={(value) => onNotificationSoundEnabledChange(value === 'On')} />
      <OptionChips label="Notification Vibration" options={['On', 'Off'] as const} value={notificationVibrationEnabled ? 'On' : 'Off'} onChange={(value) => onNotificationVibrationEnabledChange(value === 'On')} />
      <Text style={{ color: '#bde6f6', lineHeight: 20 }}>
        Local reminders follow your session settings here, while the phone still applies its own notification permissions and device behavior.
      </Text>
    </View>
  </>
);
