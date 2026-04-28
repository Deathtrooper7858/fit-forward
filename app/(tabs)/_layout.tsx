import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants';

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
      }}
    >
      <Tabs.Screen
        name="dashboard/index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📊" label="Dashboard" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tracker/index"
        options={{
          title: 'Tracker',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🍽️" label="Tracker" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="coach/index"
        options={{
          title: 'Coach',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🤖" label="Coach" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="planner/index"
        options={{
          title: 'Planner',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="📅" label="Planner" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="👤" label="Profile" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 80,
    paddingBottom: 12,
    paddingTop: 8,
  },
  tabItem:       { alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  tabItemActive: {},
  emoji:         { fontSize: 22 },
  tabLabel:      { fontSize: 10, color: Colors.tabInactive, fontWeight: '500' },
  tabLabelActive:{ color: Colors.tabActive },
});
