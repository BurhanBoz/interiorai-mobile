import Svg, { Circle, Path, Rect } from "react-native-svg";

/**
 * Line icons for the Studio home (redesign v3, 2026-10-10).
 *
 * <p>Drawn here rather than taken from an icon font so the strokes match the
 * approved mockup one-for-one: 24-unit grid, round-free 1.8–2 px strokes, no
 * fills. They are decorative — every Pressable that holds one carries its own
 * accessibilityLabel — so none of them is exposed to VoiceOver.
 */

type IconProps = { color: string; size?: number };

/** The credit pill's star. */
export function StarIcon({ color, size = 14 }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} accessible={false}>
            <Path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" />
        </Svg>
    );
}

/**
 * The add card's camera. The card still leads to both sources — its subline
 * says "Camera or photo library" — the camera is just the stronger picture.
 */
export function CameraIcon({ color, size = 24 }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} accessible={false}>
            <Path d="M3 8h3l2-3h8l2 3h3v12H3z" />
            <Circle cx={12} cy={13.5} r={3.5} />
        </Svg>
    );
}

export function ArrowIcon({ color, size = 22 }: IconProps) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} accessible={false}>
            <Path d="M5 12h14M13 6l6 6-6 6" />
        </Svg>
    );
}

/**
 * One glyph per design mode. An unknown mode (a new catalogue entry before
 * anyone drew it) falls back to the Redesign house rather than an empty tile.
 */
export function ToolIcon({ mode, color, size = 20 }: IconProps & { mode: string }) {
    const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.8 } as const;
    switch (mode) {
        case "EMPTY_ROOM":
            return (
                <Svg {...common} accessible={false}>
                    <Rect x={4} y={4} width={16} height={16} rx={2} />
                    <Path d="M4 15h16" />
                </Svg>
            );
        case "INPAINT":
            return (
                <Svg {...common} accessible={false}>
                    <Path d="M4 20l7-7M14 4l1.5 3.5L19 9l-3.5 1.5L14 14l-1.5-3.5L9 9l3.5-1.5z" />
                </Svg>
            );
        case "STYLE_TRANSFER":
            return (
                <Svg {...common} accessible={false}>
                    <Rect x={3} y={5} width={8} height={14} rx={1.5} />
                    <Rect x={13} y={5} width={8} height={14} rx={1.5} />
                </Svg>
            );
        case "OUTDOOR":
            return (
                <Svg {...common} accessible={false}>
                    <Path d="M3 20h18M7 20v-6l5-4 5 4v6M12 3v3" />
                </Svg>
            );
        case "REDESIGN":
        default:
            return (
                <Svg {...common} accessible={false}>
                    <Path d="M4 20h16M6 20V10l6-5 6 5v10" />
                </Svg>
            );
    }
}
