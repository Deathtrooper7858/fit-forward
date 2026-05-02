import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useTranslation } from 'react-i18next';
import { FileText, BarChart2, MessageCircle, Calendar, User } from 'lucide-react-native';

function TabIcon({ Icon, label, focused }: { Icon: any; label: string; focused: boolean }) {
  const colors = useTheme();
  return (
    <View style={styles.tabItem}>
      <View style={[styles.iconPill, focused && { backgroundColor: '#EAB308' }]}>
        <Icon size={24} color={focused ? '#000000' : colors.tabInactive} strokeWidth={focused ? 2.5 : 2} />
      </View>
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
        name="tracker/index"
        options={{
          title: t('tabs.tracker', 'Plan'),
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={FileText} label={t('tabs.tracker', 'Plan')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="dashboard/index"
        options={{
          title: t('tabs.dashboard', 'Progreso'),
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={BarChart2} label={t('tabs.dashboard', 'Progreso')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="coach/index"
        options={{
          title: t('tabs.coach', 'Coach'),
          tabBarIcon: ({ focused }) => (
            <TabIcon Icon={MessageCircle} label={t('tabs.coach', 'Coach')} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="planner/index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          href: null,
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
  tabItem: { 
    alignItems: 'center', 
    justifyContent: 'center',
    gap: 2, 
    paddingHorizontal: 4,
    marginTop: 4,
  },
  iconPill: {
    paddingHorizontal: 20,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 2,
  },
  tabLabel: { 
    fontSize: 10, 
    fontWeight: '600' 
  },
});
