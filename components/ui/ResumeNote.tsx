import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/config/theme";

const U = theme.umber;

/** The one-line "your plan is active, carry on" note — see useResumeNote. */
export function ResumeNote({ text }: { text: string }) {
    return (
        <View
            accessibilityLiveRegion="polite"
            style={{
                flexDirection: "row", alignItems: "center", gap: 10,
                paddingVertical: 10, paddingHorizontal: 12, marginBottom: 10,
                borderRadius: 13, backgroundColor: U.lineAccent,
                borderWidth: 1, borderColor: U.accent,
            }}
        >
            <Ionicons name="checkmark-circle" size={18} color={U.accentBright} />
            <Text style={{ ...theme.v2.rowQuiet, color: U.ink, flex: 1 }}>{text}</Text>
        </View>
    );
}
