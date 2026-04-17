import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { OptionChips } from '@/components/OptionChips';
import { AppButton } from '@/components/ui/AppButton';
import { FormField, formInputStyle } from '@/components/ui/FormField';
import { appTheme } from '@/design/theme';
import { SESSION_ALERT_MARKERS } from '@/constants/options';
import { SessionMode } from '@/types/session';
import { isReminderMarkerAllowed } from '@/utils/sessionReminders';
import { NotificationPermissionStatus } from '@/types/appState';

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
  notificationPermissionStatus: NotificationPermissionStatus;
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
  onNotificationVibrationEnabledChange,
  notificationPermissionStatus
}: ReminderSettingsSectionProps) => (
  <>
    <Text style={{ color: appTheme.colors.text, fontWeight: '700', fontSize: 16 }}>Session Timer</Text>
    <Text style={{ color: appTheme.colors.textSoft, lineHeight: 20 }}>
      {mode === 'competition'
        ? 'Competition reminders follow the absolute start and end times above.'
        : 'Set the total time you plan to fish in this session. Reminder markers fire based on elapsed time from when you begin.'}
    </Text>
    {mode === 'practice' ? (
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <FormField label="Hours">
            <TextInput value={durationHours} onChangeText={onDurationHoursChange} placeholder="0" keyboardType="number-pad" placeholderTextColor="#5a6c78" style={formInputStyle} />
          </FormField>
        </View>
        <View style={{ flex: 1 }}>
          <FormField label="Minutes">
            <TextInput value={durationMinutes} onChangeText={onDurationMinutesChange} placeholder="0" keyboardType="number-pad" placeholderTextColor="#5a6c78" style={formInputStyle} />
          </FormField>
        </View>
      </View>
    ) : null}
    {plannedEndLabel ? <Text style={{ color: appTheme.colors.textSoft }}>If you begin now, your planned end time is {plannedEndLabel}.</Text> : null}
    <View style={{ gap: 8 }}>
      <Text style={{ color: appTheme.colors.text, fontWeight: '700' }}>Reminder Markers</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SESSION_ALERT_MARKERS.map((minute) => {
          const selected = alertMarkersMinutes.includes(minute);
          const disabled = !selected && !isReminderMarkerAllowed(minute, plannedDurationMinutes);
          return (
            <AppButton
              key={minute}
              label={`${minute} min`}
              onPress={() => {
                if (disabled) return;
                onAlertMarkersChange((current) =>
                  current.includes(minute)
                    ? current.filter((value) => value !== minute)
                    : [...current, minute].sort((left, right) => left - right)
                );
              }}
              variant={selected ? 'primary' : 'ghost'}
              disabled={disabled}
            />
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <FormField label="Custom Reminder Minute" error={customAlertError}>
            <TextInput value={customAlertMinute} onChangeText={onCustomAlertMinuteChange} placeholder="Custom minute" keyboardType="number-pad" placeholderTextColor="#5a6c78" style={formInputStyle} />
          </FormField>
        </View>
        <View style={{ minWidth: 88 }}>
          <AppButton label="Add" onPress={onAddCustomAlertMarker} variant="secondary" />
        </View>
      </View>
      {reminderValidationMessage ? <Text style={{ color: '#fca5a5' }}>{reminderValidationMessage}</Text> : null}
      {!!alertMarkersMinutes.length ? <Text style={{ color: appTheme.colors.textSoft }}>Active reminders: {alertMarkersMinutes.map((minute) => `${minute} min`).join(', ')}</Text> : <Text style={{ color: appTheme.colors.textSoft }}>No reminders selected. You can use presets or add custom minute markers for your beat.</Text>}
      <AppButton label="Turn Off Reminders" onPress={() => onAlertMarkersChange([])} variant="ghost" />
      <OptionChips label="Notification Sound" options={['On', 'Off'] as const} value={notificationSoundEnabled ? 'On' : 'Off'} onChange={(value) => onNotificationSoundEnabledChange(value === 'On')} />
      <OptionChips label="Notification Vibration" options={['On', 'Off'] as const} value={notificationVibrationEnabled ? 'On' : 'Off'} onChange={(value) => onNotificationVibrationEnabledChange(value === 'On')} />
      <Text style={{ color: appTheme.colors.textSoft, lineHeight: 20 }}>
        Local reminders follow your session settings here, while the phone still applies its own notification permissions and device behavior.
      </Text>
      {notificationPermissionStatus === 'denied' ? (
        <Text style={{ color: '#fca5a5', lineHeight: 20 }}>
          Phone notifications are blocked right now, so reminder banners can only appear while the app is open.
        </Text>
      ) : null}
    </View>
  </>
);
