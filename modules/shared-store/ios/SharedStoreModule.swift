import ExpoModulesCore
import Security
import WidgetKit

/**
 * A tiny key/value store backed by a shared keychain access group, so the
 * widget extension can read data written by the app.
 *
 * App Groups would be the conventional way to share a container, but that
 * capability requires a paid Apple Developer membership. A shared keychain
 * access group needs only the `keychain-access-groups` entitlement, which
 * free personal teams can sign, and both targets carry it.
 *
 * Items are stored with `kSecAttrAccessibleAfterFirstUnlock` so the widget can
 * still render while the device is locked.
 */
public class SharedStoreModule: Module {
  // Must match the group in both entitlements files (app + widget target).
  private static let accessGroup = "A59BMF9Y7J.com.capwordsxxx.shared"
  private static let service = "com.capwordsxxx.shared"

  public func definition() -> ModuleDefinition {
    Name("SharedStore")

    Function("set") { (key: String, value: String) -> Bool in
      return SharedStoreModule.write(key: key, value: value)
    }

    Function("get") { (key: String) -> String? in
      return SharedStoreModule.read(key: key)
    }

    Function("remove") { (key: String) -> Bool in
      return SharedStoreModule.delete(key: key)
    }

    Function("reloadWidget") { (name: String?) in
      if let name, !name.isEmpty {
        WidgetCenter.shared.reloadTimelines(ofKind: name)
      } else {
        WidgetCenter.shared.reloadAllTimelines()
      }
    }

    /// Reports whether the shared group is actually reachable, so JS can fail
    /// quietly on builds where the entitlement is missing.
    Function("isAvailable") { () -> Bool in
      let probe = "__capwords_probe__"
      guard SharedStoreModule.write(key: probe, value: "1") else { return false }
      let ok = SharedStoreModule.read(key: probe) == "1"
      _ = SharedStoreModule.delete(key: probe)
      return ok
    }
  }

  private static func baseQuery(key: String) -> [String: Any] {
    return [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: key,
      kSecAttrAccessGroup as String: accessGroup,
    ]
  }

  private static func write(key: String, value: String) -> Bool {
    guard let data = value.data(using: .utf8) else { return false }
    // Replace rather than update: the payload is rewritten wholesale each time.
    SecItemDelete(baseQuery(key: key) as CFDictionary)

    var query = baseQuery(key: key)
    query[kSecValueData as String] = data
    query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlock
    return SecItemAdd(query as CFDictionary, nil) == errSecSuccess
  }

  private static func read(key: String) -> String? {
    var query = baseQuery(key: key)
    query[kSecReturnData as String] = true
    query[kSecMatchLimit as String] = kSecMatchLimitOne

    var item: CFTypeRef?
    guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
          let data = item as? Data else { return nil }
    return String(data: data, encoding: .utf8)
  }

  private static func delete(key: String) -> Bool {
    let status = SecItemDelete(baseQuery(key: key) as CFDictionary)
    return status == errSecSuccess || status == errSecItemNotFound
  }
}
