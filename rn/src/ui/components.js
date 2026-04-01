import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radius, shadow } from "./theme";

export { colors, radius } from "./theme";

export function Screen({ title, subtitle, eyebrow, children, right, scroll = false, contentContainerStyle, heroStats }) {
  const content = (
    <>
      <View style={styles.bgOrbA} />
      <View style={styles.bgOrbB} />
      <View style={styles.hero}>
        <View style={styles.heroCopy}>
          <Text style={styles.eyebrow}>{eyebrow || "Habit Tracker"}</Text>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.h1}>{title}</Text>
              {subtitle ? <Text style={styles.sub}>{subtitle}</Text> : null}
            </View>
            {right ? <View style={styles.heroActionWrap}>{right}</View> : null}
          </View>
        </View>
        {heroStats?.length ? (
          <View style={styles.heroStats}>
            {heroStats.map((item) => (
              <View key={item.label} style={styles.heroStat}>
                <Text style={styles.heroStatLabel}>{item.label}</Text>
                <Text style={styles.heroStatValue}>{item.value}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
      <View style={styles.body}>{children}</View>
    </>
  );

  return (
    <View style={styles.screen}>
      {scroll ? (
        <ScrollView contentContainerStyle={[styles.scrollContent, contentContainerStyle]} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </View>
  );
}

export function Card({ children, style, tone = "default" }) {
  return <View style={[styles.card, tone === "accent" ? styles.cardAccent : null, style]}>{children}</View>;
}

export function SectionTitle({ eyebrow, title, subtitle, right }) {
  return (
    <View style={styles.sectionHead}>
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSub}>{subtitle}</Text> : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}

export function StatCard({ label, value, accent = false, style }) {
  return (
    <View style={[styles.statCard, accent ? styles.statCardAccent : null, style]}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export function Btn({ label, onPress, kind = "default", disabled, style, textStyle }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        kind === "primary" ? styles.btnPrimary : null,
        kind === "danger" ? styles.btnDanger : null,
        kind === "ghost" ? styles.btnGhost : null,
        disabled ? styles.btnDisabled : null,
        pressed && !disabled ? styles.btnPressed : null,
        style,
      ]}
    >
      <Text
        style={[
          styles.btnText,
          kind === "primary" ? styles.btnTextLight : null,
          kind === "danger" ? styles.btnTextDanger : null,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Pill({ label, active = false, onPress, style }) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, active ? styles.pillActive : null, style]}>
      <Text style={[styles.pillText, active ? styles.pillTextActive : null]}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  multiline,
  autoCapitalize = "none",
  editable = true,
  style,
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        multiline={multiline}
        autoCapitalize={autoCapitalize}
        editable={editable}
        style={[styles.input, multiline ? styles.textarea : null, !editable ? styles.inputDisabled : null, style]}
      />
    </View>
  );
}

export function EmptyCard({ title, body, action }) {
  return (
    <Card>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {action ? <View style={{ marginTop: 4 }}>{action}</View> : null}
    </Card>
  );
}

export function Dot({ color, size = 12 }) {
  return <View style={{ width: size, height: size, borderRadius: 999, backgroundColor: color }} />;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: 14,
    gap: 16,
  },
  bgOrbA: {
    position: "absolute",
    right: -80,
    top: -40,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: "rgba(122,168,255,0.2)",
    opacity: 0.65,
  },
  bgOrbB: {
    position: "absolute",
    left: -60,
    top: 220,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "rgba(132,216,255,0.18)",
    opacity: 0.7,
  },
  hero: {
    gap: 14,
    padding: 22,
    borderRadius: radius.xl,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadow.card,
  },
  heroCopy: {
    gap: 8,
  },
  heroTopRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  heroActionWrap: {
    alignSelf: "center",
  },
  eyebrow: {
    color: colors.brandStrong,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  h1: {
    color: colors.text,
    fontSize: 32,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: -1.2,
  },
  sub: {
    marginTop: 8,
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  heroStats: {
    flexDirection: "row",
    gap: 10,
  },
  heroStat: {
    flex: 1,
    minHeight: 78,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.panelMuted,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.72)",
    justifyContent: "space-between",
  },
  heroStatLabel: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "700",
  },
  heroStatValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  body: {
    gap: 14,
  },
  card: {
    padding: 18,
    gap: 14,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelStrong,
    ...shadow.card,
  },
  cardAccent: {
    backgroundColor: "rgba(242,248,255,0.78)",
    borderColor: "rgba(47,124,246,0.16)",
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  sectionEyebrow: {
    color: colors.brandStrong,
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "700",
  },
  sectionTitle: {
    marginTop: 2,
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  sectionSub: {
    marginTop: 6,
    color: colors.muted,
    lineHeight: 20,
  },
  statCard: {
    flex: 1,
    minHeight: 94,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelMuted,
    justifyContent: "space-between",
  },
  statCardAccent: {
    backgroundColor: colors.brandSoft,
    borderColor: "rgba(198,93,46,0.18)",
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  statValue: {
    color: colors.text,
    fontSize: 26,
    lineHeight: 28,
    fontWeight: "800",
    letterSpacing: -0.8,
  },
  btn: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    backgroundColor: colors.panelMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPressed: {
    opacity: 0.88,
    transform: [{ translateY: 1 }],
  },
  btnPrimary: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
    ...shadow.strong,
  },
  btnDanger: {
    backgroundColor: colors.dangerSoft,
    borderColor: "rgba(181,63,50,0.18)",
  },
  btnGhost: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  btnDisabled: {
    opacity: 0.55,
  },
  btnText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 14,
  },
  btnTextLight: {
    color: colors.white,
  },
  btnTextDanger: {
    color: colors.danger,
  },
  pill: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.panelMuted,
  },
  pillActive: {
    backgroundColor: colors.brandSoft,
    borderColor: "rgba(47,124,246,0.18)",
  },
  pillText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 13,
  },
  pillTextActive: {
    color: colors.brandStrong,
  },
  fieldWrap: {
    gap: 8,
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  input: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "rgba(255,255,255,0.7)",
    color: colors.text,
  },
  textarea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  inputDisabled: {
    opacity: 0.5,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  emptyBody: {
    color: colors.muted,
    lineHeight: 21,
  },
});
