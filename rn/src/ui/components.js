import React from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export function Screen({ title, subtitle, children, right }) {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.h1}>{title}</Text>
          {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
        </View>
        {right ? <View>{right}</View> : null}
      </View>
      {children}
    </View>
  );
}

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Btn({ label, onPress, kind = "default", disabled }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        kind === "primary" ? styles.btnPrimary : null,
        kind === "danger" ? styles.btnDanger : null,
        disabled ? { opacity: 0.5 } : null,
        pressed ? { opacity: 0.85 } : null
      ]}
    >
      <Text style={[styles.btnText, kind !== "default" ? { color: "white" } : null]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType }) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize="none"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 14, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  h1: { fontSize: 22, fontWeight: "700" },
  sub: { marginTop: 2, opacity: 0.7 },
  card: { backgroundColor: "white", borderRadius: 14, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(10,10,20,0.12)" },
  btn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(10,10,20,0.18)", backgroundColor: "white" },
  btnPrimary: { borderColor: "transparent", backgroundColor: "#7c5cff" },
  btnDanger: { borderColor: "transparent", backgroundColor: "#ef4444" },
  btnText: { fontWeight: "600" },
  label: { fontSize: 12, opacity: 0.75 },
  input: { marginTop: 6, backgroundColor: "rgba(10,10,20,0.04)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }
});

