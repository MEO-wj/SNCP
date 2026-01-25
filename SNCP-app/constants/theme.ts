
import { Platform } from 'react-native';

const tintColorLight = '#FF8C42';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'PingFang SC',
    serif: 'ui-serif',
    rounded: 'PingFang SC',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'NotoSansCJK-Regular',
    serif: 'serif',
    rounded: 'NotoSansCJK-Regular',
    mono: 'monospace',
  },
  web: {
    sans: "'PingFang SC', 'Source Han Sans SC', 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'PingFang SC', 'Source Han Sans SC', 'Noto Sans CJK SC', 'Microsoft YaHei', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
