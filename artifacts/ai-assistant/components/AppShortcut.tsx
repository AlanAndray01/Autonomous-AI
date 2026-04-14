import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface Props {
  name: string;
  icon: string;
  iconSet?: "ion" | "material";
  color: string;
  onPress: () => void;
}

export default function AppShortcut({ name, icon, iconSet = "material", color, onPress }: Props) {
  const colors = useColors();

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.75}>
      <View
        style={[
          styles.iconBox,
          {
            backgroundColor: `${color}22`,
            borderColor: `${color}44`,
          },
        ]}
      >
        {iconSet === "ion" ? (
          <Ionicons name={icon as any} size={22} color={color} />
        ) : (
          <MaterialIcons name={icon as any} size={22} color={color} />
        )}
      </View>
      <Text style={[styles.label, { color: colors.mutedForeground }]} numberOfLines={1}>
        {name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 6,
    width: 64,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
});
