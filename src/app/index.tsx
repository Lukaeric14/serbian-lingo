import { StyleSheet, Text, View } from "react-native";

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Serbian Lingo</Text>
      <Text style={styles.subtitle}>Scaffold ready — screens land in a later wave.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#58CC02",
  },
  subtitle: {
    fontSize: 14,
    color: "#4B4B4B",
  },
});
