//
//  HaseStatsFormat.swift
//  HaseStats
//

import Foundation

/// Kleine Formatierer für Widget, Live Activity und Einstellungen.
enum HaseStatsFormat {
    /// "12:32" in der Zeitzone des Macs.
    static func clock(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "de_DE")
        formatter.dateFormat = "HH:mm"
        return formatter.string(from: date)
    }

    /// "2 h 15 min", "45 min".
    static func duration(_ seconds: Int) -> String {
        let total = max(0, seconds)
        let hours = total / 3600
        let minutes = (total % 3600) / 60
        return hours > 0 ? "\(hours) h \(minutes) min" : "\(minutes) min"
    }

    /// Kompakt für kleine Flächen: "2:15".
    static func compact(_ seconds: Int) -> String {
        let total = max(0, seconds)
        return String(format: "%d:%02d", total / 3600, (total % 3600) / 60)
    }

    /// ISO-8601 mit oder ohne Millisekunden.
    static func date(from value: String?) -> Date? {
        guard let value, !value.isEmpty else { return nil }

        let withFraction = ISO8601DateFormatter()
        withFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = withFraction.date(from: value) { return date }

        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        return plain.date(from: value)
    }
}
