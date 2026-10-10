import type { ReactNode } from "react";
import Svg, { Circle, Path, Rect } from "react-native-svg";

/**
 * Line icons for the Settings tab (redesign v3, 2026-10-10).
 *
 * <p>Same rules as the Studio set: 24-unit grid, 1.8 px strokes for row icons
 * and 2 px for chevrons, no fills. Decorative only — each row's Pressable
 * carries the label VoiceOver reads — so none of them is accessible.
 */

type IconProps = { color: string; size?: number };

function Line({ color, size = 18, strokeWidth = 1.8, children }: IconProps & { strokeWidth?: number; children: ReactNode }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} accessible={false}>
            {children}
        </Svg>
    );
}

export function ChevronIcon({ color, size = 14 }: IconProps) {
    return (
        <Line color={color} size={size} strokeWidth={2}>
            <Path d="M9 6l6 6-6 6" />
        </Line>
    );
}

export function PersonIcon(p: IconProps) {
    return (
        <Line {...p}>
            <Circle cx={12} cy={8} r={4} />
            <Path d="M4 20c1.5-4 5-5 8-5s6.5 1 8 5" />
        </Line>
    );
}

/** Manage subscription — not in the mockup (FREE has no such row); a card. */
export function CardIcon(p: IconProps) {
    return (
        <Line {...p}>
            <Rect x={3} y={5.5} width={18} height={13} rx={2} />
            <Path d="M3 10h18M7 15h4" />
        </Line>
    );
}

export function BellIcon(p: IconProps) {
    return (
        <Line {...p}>
            <Path d="M6 16V11a6 6 0 0112 0v5l2 2H4zM10 21h4" />
        </Line>
    );
}

export function GlobeIcon(p: IconProps) {
    return (
        <Line {...p}>
            <Circle cx={12} cy={12} r={9} />
            <Path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
        </Line>
    );
}

export function ShieldIcon(p: IconProps) {
    return (
        <Line {...p}>
            <Path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
        </Line>
    );
}

export function StarIcon(p: IconProps) {
    return (
        <Line {...p}>
            <Path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z" />
        </Line>
    );
}

export function HelpIcon(p: IconProps) {
    return (
        <Line {...p}>
            <Circle cx={12} cy={12} r={9} />
            <Path d="M9.5 9.5a2.5 2.5 0 015 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01" />
        </Line>
    );
}
