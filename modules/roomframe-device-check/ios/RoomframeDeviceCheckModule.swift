import ExpoModulesCore
import DeviceCheck

/**
 Bridges Apple's DeviceCheck to JS.

 A `DCDevice` token is an opaque blob only a genuine Apple device can mint.
 The backend redeems it against Apple's API to read two bits stored *per
 physical device, per developer account* — bits that outlive an app delete,
 a Keychain wipe, and a factory reset. That is what makes it the one
 welcome-bonus guard a crafted request cannot walk around; the Keychain
 `device_key` it complements is, after all, whatever the client says it is.

 DeviceCheck needs no entitlement and no user permission, and the token
 carries no identifier we can correlate across apps — Apple resolves it
 server-side and hands back only our own two bits.

 Every failure path resolves `nil` instead of rejecting. The Simulator has
 no DeviceCheck support at all, so rejecting would turn "running in the
 Simulator" into an error the whole signup flow would have to special-case.
 */
public class RoomframeDeviceCheckModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RoomframeDeviceCheck")

    /// False on the Simulator and on hardware without DeviceCheck.
    Function("isSupported") { () -> Bool in
      return DCDevice.current.isSupported
    }

    /// Base64 DCDevice token, or nil when one cannot be produced.
    AsyncFunction("generateToken") { (promise: Promise) in
      guard DCDevice.current.isSupported else {
        promise.resolve(nil)
        return
      }
      DCDevice.current.generateToken { data, error in
        if let data = data {
          promise.resolve(data.base64EncodedString())
        } else {
          // Apple throttles token generation and fails while offline. The
          // backend treats a missing token as "no K2 signal" and falls back
          // to device_key, so a real user is never blocked by this.
          NSLog("[RoomframeDeviceCheck] token unavailable: %@",
                error?.localizedDescription ?? "unknown")
          promise.resolve(nil)
        }
      }
    }
  }
}
