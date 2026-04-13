#!/usr/bin/env bash
set -euo pipefail

mkdir -p src/{app,components,db,engine,ai,types,utils}

cat > package.json <<'JSON'
{
  "name": "fishing-lab",
  "version": "1.0.0",
  "private": true,
  "main": "index.ts",
  "scripts": {
    "start": "expo start",
    "android": "expo run:android",
    "ios": "expo run:ios",
    "web": "expo start --web",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@react-navigation/native": "^6.1.18",
    "@react-navigation/native-stack": "^6.11.0",
    "expo": "^52.0.0",
    "expo-sqlite": "~15.0.7",
    "react": "18.2.0",
    "react-native": "0.76.3",
    "react-native-safe-area-context": "4.11.1",
    "react-native-screens": "4.1.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "typescript": "^5.6.3"
  }
}
JSON

cat > tsconfig.json <<'JSON'
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
JSON

cat > babel.config.js <<'JS'
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo']
  };
};
JS

cat > app.json <<'JSON'
{
  "expo": {
    "name": "Fishing Lab",
    "slug": "fishing-lab",
    "version": "1.0.0",
    "orientation": "portrait",
    "userInterfaceStyle": "light"
  }
}
JSON

cat > index.ts <<'TS'
import { registerRootComponent } from 'expo';
import App from './src/App';
registerRootComponent(App);
TS

cat > src/types/fly.ts <<'TS'
export type FlyIntent = 'imitative' | 'attractor';
export type BodyType = 'thread' | 'dubbing' | 'natural';
export type CollarType = 'none' | 'cdc' | 'hackle';

export interface FlySetup {
  name: string;
  intent: FlyIntent;
  beadSizeMm: number;
  bodyType: BodyType;
  collar: CollarType;
}
TS

cat > src/types/session.ts <<'TS'
export type WaterType = 'riffle' | 'run' | 'pool' | 'lake';
export type DepthRange = 'surface' | '1-3 ft' | '3-6 ft' | '6+ ft';
export type InsectType = 'mayfly' | 'caddis' | 'midge' | 'stonefly' | 'terrestrial';
export type InsectStage = 'larva' | 'emerger' | 'adult';
export type Confidence = 'low' | 'medium' | 'high';

export interface Session {
  id: number;
  date: string;
  waterType: WaterType;
  depthRange: DepthRange;
  insectType: InsectType;
  insectStage: InsectStage;
  insectConfidence: Confidence;
  notes?: string;
}
TS

cat > src/types/experiment.ts <<'TS'
import { FlySetup } from './fly';

export interface Experiment {
  id: number;
  sessionId: number;
  hypothesis: string;
  controlFly: FlySetup;
  variantFly: FlySetup;
  controlCasts: number;
  controlCatches: number;
  variantCasts: number;
  variantCatches: number;
  winner: 'control' | 'variant' | 'tie' | 'inconclusive';
  confidenceScore: number;
}

export interface Insight {
  type: 'pattern' | 'warning' | 'recommendation';
  message: string;
  confidence: 'low' | 'medium' | 'high';
  supportingData: Record<string, unknown>;
}
TS

cat > src/utils/calculations.ts <<'TS'
export const catchRate = (catches: number, casts: number): number => {
  if (casts <= 0) return 0;
  return catches / casts;
};

export const percentDiff = (a: number, b: number): number => {
  if (a === 0 && b === 0) return 0;
  const baseline = Math.max(Math.abs(a), 0.0001);
  return Math.abs((b - a) / baseline);
};

export const confidenceFromSamples = (n: number): 'low' | 'medium' | 'high' => {
  if (n >= 60) return 'high';
  if (n >= 25) return 'medium';
  return 'low';
};
TS

echo "Scaffold base created. (Core configs + domain + utils)."
echo "Next: add engine/db/ai/screens files (chunk 2)."
