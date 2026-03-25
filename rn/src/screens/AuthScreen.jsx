import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useApp } from "../state/AppState";
import { useToast } from "../state/ToastState";
import { Btn, Card, Field, Screen } from "../ui/components";

export default function AuthScreen() {
  const { auth } = useApp();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <Screen title="Sign in" subtitle="Supabase is configured, so sign in to sync your data.">
      <ScrollView contentContainerStyle={{ gap: 12 }}>
        <Card>
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" />
          <Field label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />

          <View style={{ flexDirection: "row", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
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
                  toast.push("Check your email to confirm (if required).");
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

        <Text style={{ opacity: 0.7 }}>
          Tip: for Android magic links, set your Supabase redirect URL / deep link to match the Expo scheme:{" "}
          <Text style={{ fontWeight: "700" }}>habit-tracker://</Text>
        </Text>
      </ScrollView>
    </Screen>
  );
}

