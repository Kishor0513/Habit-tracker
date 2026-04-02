import React, { useState } from "react";
import { Text, View } from "react-native";
import { useApp } from "../state/AppState";
import { useToast } from "../state/ToastState";
import { Btn, Card, Field, Screen, SectionTitle, colors, radius } from "../ui/components";

export default function AuthScreen() {
  const { auth } = useApp();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Screen
      title="Premium sign in."
      subtitle="Access the synced workspace with the same account flow used by the web app."
      eyebrow="Account access"
      scroll
      heroStats={[
        { label: "Mode", value: "Sync" },
        { label: "Access", value: "Email" },
        { label: "Backup", value: "Cloud" },
      ]}
    >
      <Card tone="accent">
        <SectionTitle eyebrow="Credentials" title="Authentication" subtitle="Use email/password, create an account, or request a magic link." />
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />

        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <Btn
            kind="primary"
            disabled={busy}
            label="Sign in"
            onPress={async () => {
              setBusy(true);
              try {
                await auth.signInWithPassword(email.trim(), password);
              } catch (e) {
                toast.push(e?.message ?? "Sign in failed.");
              } finally {
                setBusy(false);
              }
            }}
          />
          <Btn
            disabled={busy}
            label="Create account"
            onPress={async () => {
              setBusy(true);
              try {
                await auth.signUpWithPassword(email.trim(), password);
                toast.push("Check your email to confirm if required.");
              } catch (e) {
                toast.push(e?.message ?? "Sign up failed.");
              } finally {
                setBusy(false);
              }
            }}
          />
          <Btn
            disabled={busy}
            label="Magic link"
            onPress={async () => {
              setBusy(true);
              try {
                await auth.signInWithOtp(email.trim());
                toast.push("Magic link sent. Check your email.");
              } catch (e) {
                toast.push(e?.message ?? "Magic link failed.");
              } finally {
                setBusy(false);
              }
            }}
          />
        </View>
      </Card>

      <Card>
        <SectionTitle eyebrow="Deep links" title="Android tip" subtitle="If magic links fail, confirm the redirect URL matches the app scheme." />
        <View
          style={{
            paddingHorizontal: 14,
            paddingVertical: 12,
            borderRadius: radius.md,
            backgroundColor: "rgba(33,23,15,0.06)",
          }}
        >
          <Text style={{ color: colors.text, fontWeight: "700" }}>habit-tracker://</Text>
        </View>
      </Card>
    </Screen>
  );
}
