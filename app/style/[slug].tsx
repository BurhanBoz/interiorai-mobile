import { Redirect, useLocalSearchParams } from "expo-router";

/**
 * `/style/coastal` → the studio, pre-filled with that style (V63).
 *
 * A separate path from `/design?style=…` because share-friendly URLs read
 * better in a caption, and because Custom Product Pages are configured per-URL:
 * a clean `/style/<name>` is what you can hand to Apple Search Ads.
 *
 * Validation deliberately lives in one place — `/design` — so a bad slug
 * behaves identically no matter which URL shape brought the user in.
 */
export default function StyleDeepLink() {
    const { slug } = useLocalSearchParams<{ slug?: string }>();
    return <Redirect href={{ pathname: "/design", params: { style: slug ?? "" } }} />;
}
