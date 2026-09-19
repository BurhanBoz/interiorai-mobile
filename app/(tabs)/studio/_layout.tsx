import { Stack, usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { track } from "@/services/analytics";
import { theme } from "@/config/theme";

/**
 * The studio flow, and the one place that reports which step of it someone is
 * on.
 *
 * <p><b>Why here and not in each screen.</b> The backend sees a job or it sees
 * nothing; the middle of the flow — picked a room, picked a style, then left —
 * leaves no trace on the server at all. Reporting from the layout means every
 * step is covered by construction, including steps added later, and there is
 * no per-screen call to forget.
 *
 * <p>The step name is the route segment, not a human label: it cannot drift
 * from the routing, and it needs no translation to stay comparable across the
 * ten languages the app ships in.
 */
export default function StudioLayout() {
  const pathname = usePathname();
  const last = useRef<string | null>(null);

  useEffect(() => {
    // "/studio/style" → "style"; the flow's entry is "/studio" → "index".
    const step = pathname.replace(/^\/+|\/+$/g, "").split("/").pop() || "index";
    // A re-render on the same screen is not a new step. Without this guard
    // the funnel would count one visit many times and read as engagement.
    if (last.current === step) return;
    last.current = step;
    track("studio_step_viewed", { step });
  }, [pathname]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Umber ground (2026-09-19). The literal was the v1 near-black and is
        // what shows for the frame of a push transition, so leaving it behind
        // makes every navigation flash the old palette.
        contentStyle: { backgroundColor: theme.umber.ground },
      }}
    >
      {/* The catalogue is presented over the composer, not pushed beside it —
          the spec's sheet. Its own screen is untouched (464 lines, rebuilt in
          1.5.2); only how it arrives changed. */}
      <Stack.Screen
        name="furniture"
        options={{ presentation: "modal", animation: "slide_from_bottom" }}
      />
    </Stack>
  );
}
