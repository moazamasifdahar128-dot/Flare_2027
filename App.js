import { useState } from "react";
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";

const MAX_SECONDS = 20 * 60;

function asSeconds(duration) {
  if (duration == null || !Number.isFinite(duration) || duration <= 0) return null;
  return duration > MAX_SECONDS ? duration / 1000 : duration;
}

function clock(seconds) {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function Player({ uri, muted, nativeControls }) {
  const player = useVideoPlayer(uri, (item) => {
    item.loop = !muted;
    item.muted = muted;
    if (muted) item.pause();
    else item.play();
  });

  return (
    <VideoView
      player={player}
      style={muted ? styles.thumb : styles.video}
      contentFit="contain"
      nativeControls={nativeControls}
    />
  );
}

export default function App() {
  const [clip, setClip] = useState(null);
  const [step, setStep] = useState("pick");
  const [note, setNote] = useState("");
  const [caption, setCaption] = useState("");

  async function choose() {
    setNote("");
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setNote("Gallery permission is required.");
      return;
    }

    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["videos"],
      allowsEditing: false,
      videoExportPreset: ImagePicker.VideoExportPreset.Passthrough,
    });

    if (picked.canceled || !picked.assets?.[0]) return;

    const asset = picked.assets[0];
    const seconds = asSeconds(asset.duration);
    if (seconds != null && seconds > MAX_SECONDS) {
      setClip(null);
      setStep("pick");
      setNote(`Please upload a video under 20 minutes. This one is ${clock(seconds)}.`);
      return;
    }

    setClip({
      uri: asset.uri,
      name: asset.fileName || "video",
      bytes: asset.fileSize || 0,
      seconds,
    });
    setStep("play");
  }

  const sizeLabel = clip && clip.bytes > 0 ? `${(clip.bytes / 1024 / 1024).toFixed(1)} MB` : "";

  return (
    <SafeAreaView style={styles.root}>
      {step === "pick" || !clip ? (
        <View style={styles.center}>
          <Text style={styles.title}>Flare video test</Text>
          <Text style={styles.copy}>
            This uses the phone player, not the browser. Pick the video that failed on the website.
          </Text>
          <Pressable style={styles.primary} onPress={choose}>
            <Text style={styles.primaryText}>Choose from gallery</Text>
          </Pressable>
          {note ? <Text style={styles.warn}>{note}</Text> : null}
        </View>
      ) : null}

      {step === "play" && clip ? (
        <View style={styles.fill}>
          <Player uri={clip.uri} muted={false} nativeControls />
          <View style={styles.bar}>
            <Pressable onPress={() => setStep("pick")}>
              <Text style={styles.link}>Close</Text>
            </Pressable>
            <Text style={styles.meta} numberOfLines={1}>
              {clip.seconds ? `${clock(clip.seconds)} · ` : ""}
              {clip.name}
              {sizeLabel ? ` · ${sizeLabel}` : ""}
            </Text>
            <Pressable style={styles.primary} onPress={() => setStep("post")}>
              <Text style={styles.primaryText}>Next</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {step === "post" && clip ? (
        <View style={styles.post}>
          <View style={styles.postHead}>
            <Pressable onPress={() => setStep("play")}>
              <Text style={styles.link}>Back</Text>
            </Pressable>
            <Text style={styles.title}>Post</Text>
            <Pressable
              style={styles.primary}
              onPress={() => setNote("Test only. This screen does not upload.")}
            >
              <Text style={styles.primaryText}>Post</Text>
            </Pressable>
          </View>
          <Player uri={clip.uri} muted nativeControls={false} />
          <Text style={styles.meta}>
            {clip.name}
            {sizeLabel ? ` · ${sizeLabel}` : ""}
            {" · sound is off on this screen"}
          </Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="Caption"
            placeholderTextColor="#8a8a8a"
            style={styles.input}
          />
          {note ? <Text style={styles.warn}>{note}</Text> : null}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  fill: { flex: 1 },
  center: { flex: 1, justifyContent: "center", padding: 24 },
  title: { color: "#fff", fontSize: 20, fontWeight: "700", textAlign: "center" },
  copy: { color: "#c8c8c8", fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 12, marginBottom: 24 },
  primary: { alignSelf: "center", backgroundColor: "#fe2c55", borderRadius: 24, paddingHorizontal: 22, paddingVertical: 12 },
  primaryText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  warn: { color: "#ffb4b4", textAlign: "center", marginTop: 16, fontSize: 14 },
  video: { flex: 1, backgroundColor: "#000" },
  bar: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  link: { color: "#fff", fontSize: 16, padding: 8 },
  meta: { flex: 1, color: "#ddd", fontSize: 12 },
  post: { flex: 1, padding: 16 },
  postHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  thumb: { width: 140, height: 220, alignSelf: "center", backgroundColor: "#111", borderRadius: 12 },
  input: { marginTop: 16, borderRadius: 12, backgroundColor: "#1c1c1c", color: "#fff", padding: 14, fontSize: 16 },
});
