import Svg, { Polygon } from "react-native-svg";

/**
 * The Roomframe hexagon, as geometry rather than a bitmap.
 *
 * <p>The v1 splash shipped a logo PNG with a Photoshop transparency
 * checkerboard baked into it — grey squares behind the mark, on the first
 * screen every user sees. A flat polygon cannot acquire a background by
 * accident, and it scales to whatever size the layout asks for.
 *
 * <p>The points are the redesign spec's clip-path, expressed in a 0–100
 * viewBox so the aspect ratio comes from width/height rather than from the
 * path: 50,0 · 100,25 · 100,75 · 50,100 · 0,75 · 0,25.
 */
export function HexMark({
    width = 16,
    height = 18,
    color,
}: {
    width?: number;
    height?: number;
    color: string;
}) {
    return (
        <Svg width={width} height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
            <Polygon points="50,0 100,25 100,75 50,100 0,75 0,25" fill={color} />
        </Svg>
    );
}
