import { useState } from "react";
import { View } from "react-native";
import Svg, { Polyline, Circle } from "react-native-svg";
import type { MaskStroke } from "@/types/api";

/**
 * Renders Smart Edit mask strokes over a photo that is displayed with
 * `contentFit="cover"` — e.g. the Review screen's 4:5 preview.
 *
 * Strokes are stored in normalized IMAGE coordinates (0..1 over the original
 * photo). A cover-fit crops the image, so a naive 1:1 mapping would drift;
 * this component measures its own box, recomputes the cover transform
 * (scale + centered crop offset) from the image's aspect ratio, and maps
 * every point through it. Absolute-fill it inside the same container as the
 * <Image>.
 */
export function MaskOverlay({
  strokes,
  imageWidth,
  imageHeight,
  color = "#E1C39B",
  opacity = 0.45,
}: {
  strokes: MaskStroke[];
  imageWidth: number;
  imageHeight: number;
  color?: string;
  opacity?: number;
}) {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      onLayout={e =>
        setBox({
          w: e.nativeEvent.layout.width,
          h: e.nativeEvent.layout.height,
        })
      }
    >
      {box && box.w > 0 && box.h > 0 && imageWidth > 0 && imageHeight > 0 && (
        <MaskShapes
          strokes={strokes}
          box={box}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          color={color}
          opacity={opacity}
        />
      )}
    </View>
  );
}

function MaskShapes({
  strokes,
  box,
  imageWidth,
  imageHeight,
  color,
  opacity,
}: {
  strokes: MaskStroke[];
  box: { w: number; h: number };
  imageWidth: number;
  imageHeight: number;
  color: string;
  opacity: number;
}) {
  // contentFit="cover": scale so the image covers the box, centered crop.
  const scale = Math.max(box.w / imageWidth, box.h / imageHeight);
  const dispW = imageWidth * scale;
  const dispH = imageHeight * scale;
  const offX = (dispW - box.w) / 2;
  const offY = (dispH - box.h) / 2;

  const mapX = (nx: number) => nx * dispW - offX;
  const mapY = (ny: number) => ny * dispH - offY;

  return (
    <Svg width={box.w} height={box.h}>
      {strokes.map((s, i) => {
        const width = s.brush * dispW;
        if (s.points.length === 1) {
          return (
            <Circle
              key={i}
              cx={mapX(s.points[0].x)}
              cy={mapY(s.points[0].y)}
              r={width / 2}
              fill={color}
              opacity={opacity}
            />
          );
        }
        return (
          <Polyline
            key={i}
            points={s.points.map(p => `${mapX(p.x)},${mapY(p.y)}`).join(" ")}
            fill="none"
            stroke={color}
            strokeOpacity={opacity}
            strokeWidth={width}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}
    </Svg>
  );
}
