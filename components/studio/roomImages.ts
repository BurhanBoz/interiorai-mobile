import type { ImageSourcePropType } from "react-native";

/**
 * Room-type thumbnails, bundled (redesign v3, 2026-10-10).
 *
 * <p>The owner wanted the room strip to read like the style strip — a picture
 * of the thing, not an icon. The catalogue has no room imagery, so these 25 were
 * generated once with Nano Banana 2 (text-to-image, 1K, one shared prompt
 * template and seed: eye level, soft daylight, warm neutral palette, no people,
 * no text) and downscaled to 512px. They are illustrations of the room TYPE,
 * never a result the app made. Cost: 25 × $0.082.
 *
 * <p>A room code missing here falls back to its line icon (RoomIcon) — a code
 * the server adds later still gets a tile, just without a photo until one is
 * added here.
 */
export const ROOM_IMAGES: Record<string, ImageSourcePropType> = {
    LIVING_ROOM: require("@/assets/rooms/living_room.jpg"),
    BEDROOM: require("@/assets/rooms/bedroom.jpg"),
    KITCHEN: require("@/assets/rooms/kitchen.jpg"),
    BATHROOM: require("@/assets/rooms/bathroom.jpg"),
    DINING_ROOM: require("@/assets/rooms/dining_room.jpg"),
    HOME_OFFICE: require("@/assets/rooms/home_office.jpg"),
    KIDS_ROOM: require("@/assets/rooms/kids_room.jpg"),
    NURSERY: require("@/assets/rooms/nursery.jpg"),
    LAUNDRY_ROOM: require("@/assets/rooms/laundry_room.jpg"),
    HALLWAY: require("@/assets/rooms/hallway.jpg"),
    GARAGE: require("@/assets/rooms/garage.jpg"),
    BALCONY: require("@/assets/rooms/balcony.jpg"),
    GARDEN: require("@/assets/rooms/garden.jpg"),
    COURTYARD: require("@/assets/rooms/courtyard.jpg"),
    OUTDOOR_MAJLIS: require("@/assets/rooms/outdoor_majlis.jpg"),
    ROOFTOP: require("@/assets/rooms/rooftop.jpg"),
    POOL_AREA: require("@/assets/rooms/pool_area.jpg"),
    FACADE: require("@/assets/rooms/facade.jpg"),
    OFFICE: require("@/assets/rooms/office.jpg"),
    CONFERENCE: require("@/assets/rooms/conference.jpg"),
    RECEPTION: require("@/assets/rooms/reception.jpg"),
    RETAIL_STORE: require("@/assets/rooms/retail_store.jpg"),
    RESTAURANT: require("@/assets/rooms/restaurant.jpg"),
    HOTEL_ROOM: require("@/assets/rooms/hotel_room.jpg"),
    SPA: require("@/assets/rooms/spa.jpg"),
};

export function getRoomImage(code: string | null | undefined): ImageSourcePropType | null {
    if (!code) return null;
    return ROOM_IMAGES[code.toUpperCase()] ?? null;
}
