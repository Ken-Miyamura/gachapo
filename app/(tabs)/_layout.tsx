import { Tabs } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { useTheme } from "@/contexts/ThemeContext";

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean; color: string }) {
  return <Text style={[styles.tabIcon, { opacity: focused ? 1 : 0.6 }]}>{emoji}</Text>;
}

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
        },
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontWeight: "700",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "テーマ",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="🎰" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gacha"
        options={{
          title: "ガチャ",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="🎲" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: "コレクション",
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="📚" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "お気に入り",
          tabBarIcon: ({ focused, color }) => <TabIcon emoji="❤️" focused={focused} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 24,
  },
});
