import ExpoModulesCore
import StoreKit

/**
 * StoreKit 2 billing for CapWords.
 *
 * The point of this module is that a subscription is tied to the buyer's Apple
 * ID, not to any account we run: `Transaction.currentEntitlements` returns what
 * they own on a fresh install and on their other devices, so a paid plan
 * survives a reinstall without a login screen, a password, or a server.
 *
 * On a free personal Apple team there are no App Store Connect products to
 * load, so everything here is exercised through an Xcode StoreKit
 * configuration file (see storekit/CapWords.storekit). The code path is
 * identical — only the product source differs — so nothing changes when the
 * membership becomes paid.
 */
public class StoreKitModule: Module {
  /// Kept so entitlement changes made outside the app (renewal, refund, a
  /// purchase on another device) still reach JS while we are running.
  private var updatesTask: Task<Void, Never>?

  public func definition() -> ModuleDefinition {
    Name("StoreKitBilling")

    Events("entitlementsChanged")

    OnStartObserving {
      self.startListening()
    }

    OnStopObserving {
      self.updatesTask?.cancel()
      self.updatesTask = nil
    }

    OnDestroy {
      self.updatesTask?.cancel()
      self.updatesTask = nil
    }

    /// Whether StoreKit 2 is usable at all. iOS 15+ everywhere we ship, but
    /// callers should still degrade gracefully rather than assume.
    Function("isAvailable") { () -> Bool in
      if #available(iOS 15.0, *) { return true }
      return false
    }

    /// Product metadata for the paywall. Prices come back already localised and
    /// currency-formatted by StoreKit — never hardcode them in JS.
    AsyncFunction("getProducts") { (ids: [String]) async throws -> [[String: Any?]] in
      guard #available(iOS 15.0, *) else { return [] }
      let products = try await Product.products(for: ids)
      return products.map { StoreKitModule.describe($0) }
    }

    /// Run a purchase. Resolves with the outcome rather than throwing on a
    /// cancel, because "they changed their mind" is not an error worth an alert.
    AsyncFunction("purchase") { (id: String) async throws -> [String: Any?] in
      guard #available(iOS 15.0, *) else {
        throw StoreKitError.unsupported
      }
      guard let product = try await Product.products(for: [id]).first else {
        throw StoreKitError.productNotFound(id)
      }

      let result = try await product.purchase()
      switch result {
      case .success(let verification):
        let transaction = try StoreKitModule.checkVerified(verification)
        // Tell StoreKit we have delivered the goods, or it will keep replaying
        // this transaction on every launch.
        await transaction.finish()
        return ["status": "purchased", "productId": transaction.productID]
      case .userCancelled:
        return ["status": "cancelled", "productId": nil]
      case .pending:
        // Ask-to-buy / SCA: the sheet is gone but nothing is owned yet. The
        // entitlement will arrive later through the updates listener.
        return ["status": "pending", "productId": nil]
      @unknown default:
        return ["status": "unknown", "productId": nil]
      }
    }

    /// Everything the Apple ID currently owns. This is the restore path: no
    /// separate "restore purchases" API call is needed with StoreKit 2.
    AsyncFunction("getEntitlements") { () async -> [[String: Any?]] in
      guard #available(iOS 15.0, *) else { return [] }
      return await StoreKitModule.currentEntitlements()
    }

    /// Force a fresh look at the App Store account. Only needed for an explicit
    /// "Restore purchases" button, where people expect a visible action.
    AsyncFunction("restore") { () async throws -> [[String: Any?]] in
      guard #available(iOS 15.0, *) else { return [] }
      try await AppStore.sync()
      return await StoreKitModule.currentEntitlements()
    }
  }

  // MARK: - Helpers

  private func startListening() {
    guard #available(iOS 15.0, *), updatesTask == nil else { return }
    updatesTask = Task.detached { [weak self] in
      for await update in Transaction.updates {
        guard let self else { return }
        if let transaction = try? StoreKitModule.checkVerified(update) {
          await transaction.finish()
        }
        let entitlements = await StoreKitModule.currentEntitlements()
        self.sendEvent("entitlementsChanged", ["entitlements": entitlements])
      }
    }
  }

  @available(iOS 15.0, *)
  private static func currentEntitlements() async -> [[String: Any?]] {
    var owned: [[String: Any?]] = []
    for await result in Transaction.currentEntitlements {
      guard let transaction = try? checkVerified(result) else { continue }
      // A refunded or upgraded-away transaction still shows up here.
      if transaction.revocationDate != nil { continue }
      owned.append([
        "productId": transaction.productID,
        "purchasedAt": transaction.purchaseDate.timeIntervalSince1970 * 1000,
        "expiresAt": transaction.expirationDate.map { $0.timeIntervalSince1970 * 1000 },
        "isUpgraded": transaction.isUpgraded,
      ])
    }
    return owned
  }

  @available(iOS 15.0, *)
  private static func describe(_ product: Product) -> [String: Any?] {
    return [
      "id": product.id,
      "title": product.displayName,
      "description": product.description,
      // Already localised and currency-formatted for the buyer's storefront.
      "price": product.displayPrice,
      "type": product.type == .autoRenewable ? "subscription" : "one_time",
    ]
  }

  /// StoreKit 2 verifies receipts on-device. An unverified transaction is not
  /// something to trust, so treat it as a failure rather than granting access.
  @available(iOS 15.0, *)
  private static func checkVerified<T>(_ result: VerificationResult<T>) throws -> T {
    switch result {
    case .unverified:
      throw StoreKitError.failedVerification
    case .verified(let safe):
      return safe
    }
  }
}

private enum StoreKitError: Error, LocalizedError {
  case unsupported
  case productNotFound(String)
  case failedVerification

  var errorDescription: String? {
    switch self {
    case .unsupported:
      return "In-app purchases need iOS 15 or later."
    case .productNotFound(let id):
      return "The product \(id) is not available from the App Store."
    case .failedVerification:
      return "That purchase could not be verified."
    }
  }
}
