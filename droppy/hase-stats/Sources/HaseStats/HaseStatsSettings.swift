//
//  HaseStatsSettings.swift
//  HaseStats
//

import DroppyKit
import SwiftUI

/// Die Einstellungsseite des Droplets.
///
/// Droppy zeichnet den Kopf der Seite selbst (Icon, Name, Zusammenfassung) —
/// hier beginnt es deshalb direkt mit der ersten Einstellung.
struct HaseStatsSettings: View {
    @ObservedObject var droplet: HaseStatsDroplet

    var body: some View {
        DropletSettingsPane {
            DropletSettingsSection {
                VStack(alignment: .leading, spacing: 2) {
                    settingsSectionHeader("Verbindung")
                    Text("Adresse der Hase-Stats-App und ein Token aus Profil → Widget-Zugang.")
                        .font(.body)
                        .foregroundStyle(.secondary)
                }
            } content: {
                DropletSettingsCard {
                    DropletStackedRow(title: "Adresse") {
                        TextField(
                            "Adresse",
                            text: $droplet.baseURL,
                            prompt: Text("https://hase-stats.vercel.app")
                        )
                        .labelsHidden()
                    }

                    DropletStackedRow(title: "Token") {
                        SecureField(
                            "Token",
                            text: $droplet.token,
                            prompt: Text("hs_…")
                        )
                        .labelsHidden()
                    }

                    Button("Token im Browser anlegen") {
                        droplet.openProfilePage()
                    }
                    .buttonStyle(.bordered)
                }
            }

            DropletSettingsSection {
                settingsSectionHeader("Status")
            } content: {
                DropletSettingsCard {
                    DropletControlRow(title: "Verbindung") {
                        DropletValuePill(text: droplet.connectionLabel)
                    }

                    DropletControlRow(title: "Heute") {
                        DropletValuePill(
                            text: HaseStatsFormat.duration(droplet.todaySeconds)
                        )
                    }

                    DropletControlRow(title: "Aktualisieren") {
                        Button("Jetzt prüfen") {
                            droplet.refresh()
                        }
                        .buttonStyle(.bordered)
                    }
                }
            }
        }
    }
}

// MARK: - Anbindung an Droppy

extension HaseStatsDroplet: SettingsPaneProviding {
    public func makeSettingsPane(context: SettingsPaneContext) -> AnyView {
        AnyView(HaseStatsSettings(droplet: self))
    }

    public var settingsSearchEntries: [SettingsSearchEntry] {
        [
            SettingsSearchEntry(title: "Adresse", keywords: ["url", "server", "hase"]),
            SettingsSearchEntry(title: "Token", keywords: ["key", "widget", "zugang"])
        ]
    }
}

/// Marker: dieses Droplet zeigt HUDs auf der Notch.
extension HaseStatsDroplet: HUDPresenting {}
