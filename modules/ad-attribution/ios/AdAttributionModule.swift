import ExpoModulesCore
import AdServices

/**
 * Apple Search Ads attribution token (V63).
 *
 * `AAAttribution.attributionToken()` returns a short-lived token that the
 * backend exchanges with Apple for campaign / keyword data.
 *
 * Two things worth knowing, because both are counter-intuitive:
 *
 * 1. **This does NOT require App Tracking Transparency.** AdServices is
 *    Apple's own, privacy-preserving attribution path — no IDFA, no ATT
 *    prompt, nothing for the user to allow. Adding an ATT prompt "to be safe"
 *    would cost conversions for a permission this API never asks for.
 *
 * 2. **Minting can fail and that is normal.** On a device that never saw an
 *    ad, in the Simulator, or before the framework is ready, it throws. A
 *    failure is not an error worth surfacing — it means "no attribution",
 *    which is the answer for most organic installs. We return nil and let the
 *    caller move on.
 */
public class AdAttributionModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AdAttribution")

    AsyncFunction("getAttributionToken") { () -> String? in
      guard #available(iOS 14.3, *) else { return nil }
      // `try?` on purpose: every documented failure (no ad exposure,
      // Simulator, framework unavailable) maps to the same product answer.
      return try? AAAttribution.attributionToken()
    }

    Function("isSupported") { () -> Bool in
      if #available(iOS 14.3, *) { return true }
      return false
    }
  }
}
