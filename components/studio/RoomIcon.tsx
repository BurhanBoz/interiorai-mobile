import Svg, { Path } from "react-native-svg";

/**
 * Line icons for the room-type strip (redesign v3, 2026-10-10).
 *
 * <p>Keyed by the server catalogue's room CODE (the same codes the
 * `catalog.room_<CODE>` translations use). The catalogue is the source of
 * truth for which rooms exist — this map only decorates them, so a room the
 * server adds tomorrow still appears, with {@link GENERIC} until it gets its
 * own drawing. Never filter the strip by this map.
 *
 * <p>All paths sit on a 24×24 grid, stroked, no fills, so one colour prop
 * drives both the idle and the selected (gold) state.
 */
const ICONS: Record<string, string> = {
    LIVING_ROOM: "M3 18v-5a2 2 0 012-2h14a2 2 0 012 2v5M5 11V8a2 2 0 012-2h10a2 2 0 012 2v3M3 18h18",
    BEDROOM: "M3 19V8M3 13h18v6M21 19v-4M7 13v-2a2 2 0 012-2h3v4",
    KITCHEN: "M4 21V3h16v18M4 10h16M9 6h1M9 14h1",
    DINING_ROOM: "M4 10h16M6 10v9M18 10v9M8 6h8",
    OFFICE: "M3 20h18M5 20V9h14v11M9 9V5h6v4",
    HOME_OFFICE: "M4 4h16v10H4zM12 14v4M8 20h8",
    BATHROOM: "M4 12h16v3a4 4 0 01-4 4H8a4 4 0 01-4-4zM6 12V6a2 2 0 014 0",
    BALCONY: "M3 11h18M5 11v9M9 11v9M15 11v9M19 11v9M3 20h18M7 11V5h10v6",
    CAFE: "M5 8h11v6a4 4 0 01-4 4H9a4 4 0 01-4-4zM16 10h2a2 2 0 010 4h-2M8 3v2M12 3v2",
    CONFERENCE: "M4 11h16v3H4zM7 14v5M17 14v5M7 8V6M12 8V6M17 8V6",
    GARAGE: "M3 20V9l9-5 9 5v11M7 20v-8h10v8M7 15h10",
    HALLWAY: "M6 21V3h12v18M3 21h18M14 12h1",
    HOTEL_ROOM: "M4 17h16M6 17a6 6 0 0112 0M12 9V7M10 7h4M3 20h18",
    KIDS_ROOM: "M12 3l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.4l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z",
    NURSERY: "M4 6v14M20 6v14M4 10h16M4 17h16M8 10v7M12 10v7M16 10v7",
    LAUNDRY_ROOM: "M5 3h14v18H5zM5 7h14M8.5 14a3.5 3.5 0 107 0 3.5 3.5 0 10-7 0",
    RECEPTION: "M3 20h18M5 20v-7h14v7M9 13a3 3 0 016 0M12 8v2",
    RESTAURANT: "M7 3v8M5 3v5a2 2 0 004 0V3M7 11v10M16 3c-2 2-2 6 0 8v10",
    RETAIL_STORE: "M5 8h14l-1 13H6zM9 8V6a3 3 0 016 0v2",
    SPA: "M12 3c4 4 6 7 6 10a6 6 0 01-12 0c0-3 2-6 6-10z",
};

/** A house — for any room code the map above does not know yet. */
const GENERIC = "M4 11l8-7 8 7v9H4zM10 20v-5h4v5";

export function RoomIcon({ code, color, size = 22 }: { code: string; color: string; size?: number }) {
    const d = ICONS[code?.toUpperCase?.() ?? ""] ?? GENERIC;
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityElementsHidden importantForAccessibility="no">
            <Path d={d} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
    );
}
