import TurboModuleRegistry from 'react-native/Libraries/TurboModule/TurboModuleRegistry';

let constants = null;

const NativeModule = TurboModuleRegistry.getEnforcing('SourceCode');

const NativeSourceCode = {
  getConstants() {
    if (constants == null) {
      constants = NativeModule.getConstants();
    }

    return constants;
  },
};

export default NativeSourceCode;
