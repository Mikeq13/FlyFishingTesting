import React from 'react';
import { Text, View } from 'react-native';
import { AppButton } from '@/components/ui/AppButton';
import { SectionCard } from '@/components/ui/SectionCard';
import { StatusBanner } from '@/components/ui/StatusBanner';
import { InlineSummaryRow } from '@/components/ui/InlineSummaryRow';
import { useTheme } from '@/design/theme';
import { HandsFreeActionContext, HandsFreeActionResult, HandsFreeCommand } from '@/types/handsFree';
import { executeHandsFreeCommand } from '@/utils/handsFreeActions';

type TestCommand = {
  label: string;
  command: HandsFreeCommand;
};

type TestResult = {
  id: string;
  label: string;
  result: HandsFreeActionResult;
};

const TEST_COMMANDS: TestCommand[] = [
  { label: 'Resume Outing', command: { action: 'resume_outing', source: 'app' } },
  { label: 'Log Fish', command: { action: 'log_fish', source: 'app' } },
  { label: 'Add Note', command: { action: 'add_note', source: 'app', noteText: 'Manual hands-free beta test note.' } },
  { label: 'Change Water', command: { action: 'change_water', source: 'app', waterType: 'run' } },
  { label: 'Change Technique', command: { action: 'change_technique', source: 'app', technique: 'Euro Nymphing' } },
  { label: 'Missing Note Payload', command: { action: 'add_note', source: 'app' } },
  { label: 'Unsupported Command', command: { action: 'unsupported_command' as HandsFreeCommand['action'], source: 'app' } }
];

const formatResultCode = (code: HandsFreeActionResult['code']) =>
  code
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');

export const HandsFreeTestPanel = ({
  context
}: {
  context: HandsFreeActionContext;
}) => {
  const { theme } = useTheme();
  const [lastResult, setLastResult] = React.useState<HandsFreeActionResult | null>(null);
  const [resultHistory, setResultHistory] = React.useState<TestResult[]>([]);
  const [runningLabel, setRunningLabel] = React.useState<string | null>(null);

  const runTest = async (testCommand: TestCommand) => {
    setRunningLabel(testCommand.label);
    try {
      const result = await executeHandsFreeCommand(testCommand.command, context);
      setLastResult(result);
      setResultHistory((current) => [
        {
          id: `${Date.now()}-${testCommand.label}`,
          label: testCommand.label,
          result
        },
        ...current
      ].slice(0, 6));
    } catch (error) {
      const result: HandsFreeActionResult = {
        ok: false,
        code: 'command_failed',
        message: error instanceof Error ? error.message : 'Hands-free test command failed.'
      };
      setLastResult(result);
      setResultHistory((current) => [
        {
          id: `${Date.now()}-${testCommand.label}`,
          label: testCommand.label,
          result
        },
        ...current
      ].slice(0, 6));
    } finally {
      setRunningLabel(null);
    }
  };

  return (
    <SectionCard
      title="Hands-Free Test Panel"
      subtitle="Trigger the same command path used by Android Assistant, Siri, and watch handoff before asking a tester to try it in the field."
      tone="light"
    >
      <InlineSummaryRow
        label="Active Outing"
        value={context.activeOuting ? `${context.activeOuting.mode} session ${context.activeOuting.sessionId}` : 'No active outing'}
        valueMuted={!context.activeOuting}
        tone="light"
      />
      <InlineSummaryRow
        label="Dictation"
        value={context.dictationEnabled ? 'Enabled' : 'Disabled'}
        valueMuted={!context.dictationEnabled}
        tone="light"
      />
      {lastResult ? (
        <StatusBanner
          tone={lastResult.ok ? 'success' : lastResult.code === 'command_failed' ? 'error' : 'warning'}
          text={`${formatResultCode(lastResult.code)}: ${lastResult.message}`}
        />
      ) : null}
      <View style={{ gap: 8 }}>
        {TEST_COMMANDS.map((testCommand) => (
          <AppButton
            key={testCommand.label}
            label={runningLabel === testCommand.label ? `Testing ${testCommand.label}...` : testCommand.label}
            onPress={() => {
              runTest(testCommand).catch(() => undefined);
            }}
            disabled={!!runningLabel}
            variant={testCommand.command.action === 'resume_outing' ? 'primary' : 'secondary'}
            surfaceTone="light"
          />
        ))}
      </View>
      {resultHistory.length ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: theme.colors.textDark, fontWeight: '800' }}>Current Test Results</Text>
          {resultHistory.map((entry) => (
            <View
              key={entry.id}
              style={{
                gap: 4,
                borderRadius: theme.radius.md,
                borderWidth: 1,
                borderColor: entry.result.ok ? theme.colors.successBorder : theme.colors.warningBorder,
                backgroundColor: theme.colors.nestedSurface,
                padding: theme.spacing.md
              }}
            >
              <Text style={{ color: theme.colors.textDark, fontWeight: '800' }}>{entry.label}</Text>
              <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 19 }}>
                {formatResultCode(entry.result.code)}: {entry.result.message}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={{ color: theme.colors.textDarkSoft, lineHeight: 20 }}>
        Expected failure states are useful: dictation off should say it is disabled, no active outing should explain that no outing is available, and unsupported commands should be explicit.
      </Text>
    </SectionCard>
  );
};
