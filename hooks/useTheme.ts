import { useSettingsStore } from '../store';
import { Colors, ThemeColors } from '../constants/Colors';

export function useTheme() {
  const theme = useSettingsStore((state) => state.theme);
  const colors = Colors[theme] || Colors.dark;
  return { ...colors, theme };
}
