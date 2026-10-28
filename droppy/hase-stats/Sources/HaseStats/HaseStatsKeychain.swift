//
//  HaseStatsKeychain.swift
//  HaseStats
//

import Foundation
import Security

/// Keychain-Zugriff für das Widget-Token.
///
/// Das Token ist ein Passwortersatz. `DropletPreferencesService` ist eine
/// lesbare plist — dort gehört es nicht hinein. Also generisches Passwort im
/// Login-Keychain, mit Service und Account auf dieses Droplet beschränkt.
enum HaseStatsKeychain {
    private static let service = "app.getdroppy.hase-stats"

    static func string(for account: String) -> String? {
        var query = baseQuery(account)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne

        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data,
              let value = String(data: data, encoding: .utf8)
        else { return nil }

        return value
    }

    static func set(_ value: String?, for account: String) {
        let trimmed = value?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""

        guard !trimmed.isEmpty else {
            SecItemDelete(baseQuery(account) as CFDictionary)
            return
        }

        let attributes: [String: Any] = [
            kSecValueData as String: Data(trimmed.utf8),
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]

        let status = SecItemUpdate(
            baseQuery(account) as CFDictionary,
            attributes as CFDictionary
        )

        if status == errSecItemNotFound {
            var insert = baseQuery(account)
            insert.merge(attributes) { current, _ in current }
            SecItemAdd(insert as CFDictionary, nil)
        }
    }

    private static func baseQuery(_ account: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
    }
}
