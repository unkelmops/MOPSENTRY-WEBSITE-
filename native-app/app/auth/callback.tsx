import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { supabase } from "../../src/lib/supabase";
import { palette } from "../../src/lib/theme";
import { AmbientBackground } from "../../src/components/AmbientBackground";

export default function AuthCallbackScreen() {
  const params = useLocalSearchParams<{ code?: string | string[]; flow?: string | string[]; type?: string | string[]; access_token?: string | string[]; refresh_token?: string | string[]; error_description?: string | string[] }>();
  const [message, setMessage] = useState("Securing your MOPSENTRY session…");

  useEffect(() => {
    let active = true;
    const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
    const finish = async () => {
      try {
        const errorDescription = first(params.error_description);
        if (errorDescription) throw new Error(errorDescription);
        const code = first(params.code);
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const accessToken = first(params.access_token);
          const refreshToken = first(params.refresh_token);
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            if (error) throw error;
          } else {
            const { data, error } = await supabase.auth.getSession();
            if (error || !data.session) throw error ?? new Error("The confirmation link has expired. Request a new one.");
          }
        }
        if (!active) return;
        if (first(params.flow) === "recovery" || first(params.type) === "recovery") router.replace("/auth/reset-password");
        else router.replace("/home");
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Could not complete secure sign-in. Request a new email link.");
      }
    };
    void finish();
    return () => { active = false; };
  }, [params.code, params.flow, params.type, params.access_token, params.refresh_token, params.error_description]);

  return <View style={styles.safe}><AmbientBackground/><View style={styles.panel}><ActivityIndicator color={palette.blue}/><Text style={styles.title}>MOPSENTRY SECURE ACCESS</Text><Text style={styles.message}>{message}</Text><Text style={styles.help}>If this link has expired, return to Sign In and request a new email.</Text></View></View>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:palette.background,justifyContent:"center",padding:24},panel:{backgroundColor:palette.surface,borderColor:palette.border,borderWidth:1,borderRadius:20,padding:24,alignItems:"center",gap:14},title:{color:palette.blueBright,fontSize:10,fontWeight:"900",letterSpacing:1.5},message:{color:palette.text,fontSize:14,textAlign:"center",lineHeight:21},help:{color:palette.muted,fontSize:11,textAlign:"center",lineHeight:18}});
