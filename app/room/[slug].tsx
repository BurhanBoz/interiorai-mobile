import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * `/room/kitchen` → the studio, pre-filled with that room type (V63).
 * See `app/style/[slug].tsx` for why these live as their own paths.
 */
export default function RoomDeepLink() {
    const { slug } = useLocalSearchParams<{ slug?: string }>();
    return <Redirect href={{ pathname: "/design", params: { room: slug ?? "" } }} />;
}
