//
//  HaseStatsAPI.swift
//  HaseStats
//
//  Client für die Widget-API von Hase Stats (`/api/widget/…`). Dieselbe API,
//  die das Scriptable-Widget auf dem iPhone benutzt: Bearer-Token, ein
//  Status-Endpunkt und ein idempotenter Ein-/Auscheck-Endpunkt.
//

import Foundation

/// Antwort von `/api/widget/status` und `/api/widget/presence`.
struct PresenceStatus: Decodable, Sendable, Equatable {
    let username: String
    /// Läuft gerade eine Session?
    let open: Bool
    /// Start der offenen Session (ISO 8601), sonst `nil`.
    let startedAt: String?
    /// Anwesenheitszeit heute in Sekunden (Europe/Berlin).
    let todaySeconds: Int
    let serverTime: String

    var startedDate: Date? { HaseStatsFormat.date(from: startedAt) }
}

enum PresenceAPIError: LocalizedError {
    case invalidURL
    case unauthorized
    case server(String)
    case network

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Adresse ist ungültig."
        case .unauthorized:
            return "Token ungültig — im Profil neu anlegen."
        case .server(let message):
            return message
        case .network:
            return "Keine Verbindung."
        }
    }
}

/// Zugriff auf die Hase-Stats-Widget-API.
struct PresenceAPI: Sendable {
    let baseURL: String
    let token: String

    func status() async throws -> PresenceStatus {
        try await send(path: "/api/widget/status", method: "GET", body: nil)
    }

    /// Setzt den Zustand idempotent — bewusst kein Toggle, damit ein zweiter
    /// Tap oder ein wiederholter Aufruf nicht zurückschaltet.
    func setPresence(open: Bool) async throws -> PresenceStatus {
        let body = try JSONEncoder().encode(["open": open])
        return try await send(path: "/api/widget/presence", method: "POST", body: body)
    }

    private func send(path: String, method: String, body: Data?) async throws -> PresenceStatus {
        guard let url = URL(string: Self.normalized(baseURL) + path),
              let scheme = url.scheme?.lowercased(),
              scheme == "https" || scheme == "http",
              url.host != nil
        else {
            throw PresenceAPIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 12
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        if let body {
            request.httpBody = body
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await URLSession.shared.data(for: request)
        } catch {
            throw PresenceAPIError.network
        }

        guard let http = response as? HTTPURLResponse else {
            throw PresenceAPIError.network
        }

        switch http.statusCode {
        case 200:
            do {
                return try JSONDecoder().decode(PresenceStatus.self, from: data)
            } catch {
                throw PresenceAPIError.server("Antwort konnte nicht gelesen werden.")
            }
        case 401:
            throw PresenceAPIError.unauthorized
        default:
            struct ErrorBody: Decodable { let error: String }
            let message = (try? JSONDecoder().decode(ErrorBody.self, from: data))?.error
            throw PresenceAPIError.server(message ?? "Serverfehler (\(http.statusCode)).")
        }
    }

    /// Entfernt Leerzeichen und Schrägstriche am Ende.
    static func normalized(_ value: String) -> String {
        var base = value.trimmingCharacters(in: .whitespacesAndNewlines)
        while base.hasSuffix("/") { base.removeLast() }
        return base
    }
}
