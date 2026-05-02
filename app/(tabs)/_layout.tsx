import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  const colors = useTheme();
  return (
    <View style={styles.tabItem}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, { color: focused ? colors.tabActive : colors.tabInactive }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const colors = useTheme();
  
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { backgroundColor: colors.surface, borderTopColor: colors.border }],
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
      }}
    >
      <Tabs.Screen
        name="dashboard/index"
        options={{
          title: t('tabs.dashboard'),
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📊" label={t('tabs.dashboard')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tracker/index"
        options={{
          title: t('tabs.tracker'),
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🍽️" label={t('tabs.tracker')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="coach/index"
        options={{
          title: t('tabs.coach'),
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🤖" label={t('tabs.coach')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="planner/index"
        options={{
          title: t('tabs.planner'),
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🗓️" label={t('tabs.planner')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: t('tabs.profile'),
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label={t('tabs.profile')} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 12,
    paddingTop: 8,
  },
  tabItem:       { alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  emoji:         { fontSize: 22 },
  tabLabel:      { fontSize: 10, fontWeight: '500' },
});
