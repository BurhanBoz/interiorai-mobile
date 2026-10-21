import ExpoModulesCore
import StoreKit

/**
 Read-only StoreKit 2 bridge (3.0.0, 21 Oct 2026).

 Why: when RevenueCat's server cannot validate a receipt, its SDK throws for a
 consumable (a credit pack) and hands the app no transaction id — Apple has the
 money, the app says "failed", the server never hears of it. StoreKit itself
 still holds that purchase as an UNFINISHED transaction (RevenueCat finishes a
 transaction only after it has recorded it), so the app can read the id here and
 let our server settle it straight with Apple (POST /api/iap/confirm).

 This module never finishes, buys or changes anything: it only lists. Finishing
 stays RevenueCat's job, so its own retry keeps working alongside ours.
 */
public class RoomframeStoreKitModule: Module {
  public func definition() -> ModuleDefinition {
    Name("RoomframeStoreKit")

    /// Purchases StoreKit has delivered but nobody has finished yet.
    AsyncFunction("unfinishedTransactions") { () async -> [[String: Any]] in
      var rows: [[String: Any]] = []
      for await result in Transaction.unfinished {
        rows.append(Self.row(result))
      }
      return rows
    }

    /// The subscriptions (and non-consumables) Apple says this Apple ID is entitled to now.
    AsyncFunction("currentEntitlements") { () async -> [[String: Any]] in
      var rows: [[String: Any]] = []
      for await result in Transaction.currentEntitlements {
        rows.append(Self.row(result))
      }
      return rows
    }
  }

  private static func row(_ result: VerificationResult<Transaction>) -> [String: Any] {
    let t: Transaction
    let verified: Bool
    switch result {
    case .verified(let tx):
      t = tx
      verified = true
    case .unverified(let tx, _):
      t = tx
      verified = false
    }
    var row: [String: Any] = [
      "transactionId": String(t.id),
      "originalTransactionId": String(t.originalID),
      "productId": t.productID,
      "purchaseDateMs": t.purchaseDate.timeIntervalSince1970 * 1000,
      "verified": verified,
    ]
    if let token = t.appAccountToken {
      row["appAccountToken"] = token.uuidString.lowercased()
    }
    if let revoked = t.revocationDate {
      row["revokedAtMs"] = revoked.timeIntervalSince1970 * 1000
    }
    return row
  }
}
