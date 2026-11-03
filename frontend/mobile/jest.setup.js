// Jest setup — register mocks for native modules pulled in transitively by
// modules under test (the locale store uses AsyncStorage at module load).
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
