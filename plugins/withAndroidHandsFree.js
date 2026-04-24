const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');

const SHORTCUTS_META_DATA_NAME = 'android.app.shortcuts';
const HANDS_FREE_HOST = 'hands-free';

const getIntentFilterItems = (activity) => {
  const existing = activity['intent-filter'];
  if (!existing) {
    activity['intent-filter'] = [];
    return activity['intent-filter'];
  }

  if (Array.isArray(existing)) {
    return existing;
  }

  activity['intent-filter'] = [existing];
  return activity['intent-filter'];
};

const hasHandsFreeIntentFilter = (activity, scheme) => {
  const filters = getIntentFilterItems(activity);
  return filters.some((filter) => {
    const actions = filter.action ?? [];
    const categories = filter.category ?? [];
    const dataItems = filter.data ?? [];

    const hasViewAction = actions.some((item) => item?.$?.['android:name'] === 'android.intent.action.VIEW');
    const hasBrowsableCategory = categories.some((item) => item?.$?.['android:name'] === 'android.intent.category.BROWSABLE');
    const hasSchemeAndHost = dataItems.some(
      (item) => item?.$?.['android:scheme'] === scheme && item?.$?.['android:host'] === HANDS_FREE_HOST
    );

    return hasViewAction && hasBrowsableCategory && hasSchemeAndHost;
  });
};

const ensureHandsFreeIntentFilter = (activity, scheme) => {
  if (hasHandsFreeIntentFilter(activity, scheme)) return;

  getIntentFilterItems(activity).push({
    action: [
      {
        $: {
          'android:name': 'android.intent.action.VIEW',
        },
      },
    ],
    category: [
      {
        $: {
          'android:name': 'android.intent.category.DEFAULT',
        },
      },
      {
        $: {
          'android:name': 'android.intent.category.BROWSABLE',
        },
      },
    ],
    data: [
      {
        $: {
          'android:scheme': scheme,
          'android:host': HANDS_FREE_HOST,
        },
      },
    ],
  });
};

const ensureMetaDataItem = (activity, name, resourceValue) => {
  const existing = activity['meta-data'] ?? [];
  const match = existing.find((item) => item?.$?.['android:name'] === name);

  if (match) {
    match.$['android:resource'] = resourceValue;
  } else {
    existing.push({
      $: {
        'android:name': name,
        'android:resource': resourceValue,
      },
    });
  }

  activity['meta-data'] = existing;
};

const buildArrayResourceXml = () => `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string-array name="fishing_lab_resume_queries">
    <item>resume current outing</item>
    <item>open my current outing</item>
    <item>resume my outing</item>
  </string-array>
  <string-array name="fishing_lab_log_fish_queries">
    <item>log fish</item>
    <item>log a fish</item>
    <item>record a fish</item>
  </string-array>
  <string-array name="fishing_lab_add_note_queries">
    <item>add note $noteText</item>
    <item>save note $noteText</item>
    <item>record note $noteText</item>
  </string-array>
  <string-array name="fishing_lab_change_water_queries">
    <item>change water to $waterType</item>
    <item>set water to $waterType</item>
    <item>switch water to $waterType</item>
  </string-array>
  <string-array name="fishing_lab_change_technique_queries">
    <item>change technique to $technique</item>
    <item>set technique to $technique</item>
    <item>switch technique to $technique</item>
  </string-array>
</resources>
`;

const buildShortcutsXml = (scheme) => `<?xml version="1.0" encoding="utf-8"?>
<shortcuts
    xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto">

    <capability
        android:name="custom.actions.intent.FISHING_LAB_RESUME_OUTING"
        app:queryPatterns="@array/fishing_lab_resume_queries">
        <intent>
            <url-template android:value="${scheme}://${HANDS_FREE_HOST}?action=resume_outing&amp;source=assistant" />
        </intent>
    </capability>

    <capability
        android:name="custom.actions.intent.FISHING_LAB_LOG_FISH"
        app:queryPatterns="@array/fishing_lab_log_fish_queries">
        <intent>
            <url-template android:value="${scheme}://${HANDS_FREE_HOST}?action=log_fish&amp;source=assistant" />
        </intent>
    </capability>

    <capability
        android:name="custom.actions.intent.FISHING_LAB_ADD_NOTE"
        app:queryPatterns="@array/fishing_lab_add_note_queries">
        <intent>
            <url-template android:value="${scheme}://${HANDS_FREE_HOST}?action=add_note&amp;source=assistant{&amp;noteText}" />
            <parameter
                android:name="noteText"
                android:key="noteText"
                android:mimeType="https://schema.org/Text" />
        </intent>
        <intent>
            <url-template android:value="${scheme}://${HANDS_FREE_HOST}?action=add_note&amp;source=assistant" />
        </intent>
    </capability>

    <capability
        android:name="custom.actions.intent.FISHING_LAB_CHANGE_WATER"
        app:queryPatterns="@array/fishing_lab_change_water_queries">
        <intent>
            <url-template android:value="${scheme}://${HANDS_FREE_HOST}?action=change_water&amp;source=assistant{&amp;waterType}" />
            <parameter
                android:name="waterType"
                android:key="waterType"
                android:mimeType="https://schema.org/Text" />
        </intent>
        <intent>
            <url-template android:value="${scheme}://${HANDS_FREE_HOST}?action=change_water&amp;source=assistant" />
        </intent>
    </capability>

    <capability
        android:name="custom.actions.intent.FISHING_LAB_CHANGE_TECHNIQUE"
        app:queryPatterns="@array/fishing_lab_change_technique_queries">
        <intent>
            <url-template android:value="${scheme}://${HANDS_FREE_HOST}?action=change_technique&amp;source=assistant{&amp;technique}" />
            <parameter
                android:name="technique"
                android:key="technique"
                android:mimeType="https://schema.org/Text" />
        </intent>
        <intent>
            <url-template android:value="${scheme}://${HANDS_FREE_HOST}?action=change_technique&amp;source=assistant" />
        </intent>
    </capability>
</shortcuts>
`;

const withAndroidHandsFree = (config) => {
  const scheme = config.scheme || config.android?.package || 'fishinglab';

  config = withAndroidManifest(config, (nextConfig) => {
    const activity = AndroidConfig.Manifest.getRunnableActivity(nextConfig.modResults);

    if (!activity) {
      throw new Error('Android hands-free setup could not find a runnable launcher activity.');
    }

    ensureMetaDataItem(activity, SHORTCUTS_META_DATA_NAME, '@xml/shortcuts');
    ensureHandsFreeIntentFilter(activity, scheme);
    return nextConfig;
  });

  config = withDangerousMod(config, [
    'android',
    async (nextConfig) => {
      const projectRoot = nextConfig.modRequest.platformProjectRoot;
      const xmlDir = path.join(projectRoot, 'app', 'src', 'main', 'res', 'xml');
      const valuesDir = path.join(projectRoot, 'app', 'src', 'main', 'res', 'values');

      await fs.promises.mkdir(xmlDir, { recursive: true });
      await fs.promises.mkdir(valuesDir, { recursive: true });

      await fs.promises.writeFile(path.join(xmlDir, 'shortcuts.xml'), buildShortcutsXml(scheme), 'utf8');
      await fs.promises.writeFile(path.join(valuesDir, 'handsfree-assistant-arrays.xml'), buildArrayResourceXml(), 'utf8');

      return nextConfig;
    },
  ]);

  return config;
};

module.exports = withAndroidHandsFree;
