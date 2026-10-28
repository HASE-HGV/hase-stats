//
//  HaseStatsDroplet.swift
//  HaseStats
//
//  Ein Droplet für den Hase-Raum: auf dem Shelf zeigt es, ob du gerade
//  eingecheckt bist und wie viel Zeit heute zusammengekommen ist, und checkt
//  per Klick ein oder aus. Neben der Notch läuft die laufende Session als
//  Live Activity mit.
//
//  Die Daten kommen aus derselben Widget-API wie das iPhone-Widget
//  (`/api/widget/status` und `/api/widget/presence`, Bearer-Token aus
//  Profil → Widget-Zugang). Adresse liegt in den Preferences, das Token im
//  Keychain.
//

import Combine
import DroppyKit
import SwiftUI

// MARK: - Principal

@objc(HaseStatsPrincipal)
public final class HaseStatsPrincipal: NSObject, DropletPrincipal {
    public override init() { super.init() }

    @MainActor public func makeDroplet() -> AnyObject { HaseStatsDroplet() }
}

// MARK: - Droplet

@MainActor
public final class HaseStatsDroplet: NSObject, ObservableObject, Droplet {
    /// Muss mit `droplet.json` und der Bundle-ID übereinstimmen.
    public nonisolated static let id: DropletID = "hase-stats"

    private enum Key {
        static let baseURL = "baseURL"
        static let token = "widget-token"
    }

    /// Abstand zwischen zwei automatischen Abfragen.
    private enum Interval {
        /// Session läuft: „heute“ soll halbwegs frisch sein.
        static let open: TimeInterval = 60
        /// Nur Status, nichts läuft: seltener fragen (Batterie).
        static let idle: TimeInterval = 180
        /// Nach einem Fehler früher noch einmal.
        static let retry: TimeInterval = 30
    }

    private var host: DropletHost?
    private var refreshLoop: Task<Void, Never>?
    private var settingsTask: Task<Void, Never>?
    private var isLoaded = false

    private let activitySubject = CurrentValueSubject<LiveActivityState?, Never>(nil)

    @Published private(set) var status: PresenceStatus?
    @Published private(set) var errorMessage: String?
    @Published private(set) var isBusy = false
    @Published private(set) var isRefreshing = false

    /// Adresse der App, ohne Schrägstrich am Ende.
    @Published var baseURL: String = "" {
        didSet {
            guard isLoaded, baseURL != oldValue else { return }
            settingsChanged()
        }
    }

    /// Widget-Token (`hs_…`). Landet im Keychain, nie in den Preferences.
    @Published var token: String = "" {
        didSet {
            guard isLoaded, token != oldValue else { return }
            settingsChanged()
        }
    }

    // MARK: Lifecycle

    public func activate(host: DropletHost) throws {
        self.host = host

        baseURL = host.preferences.value(forKey: Key.baseURL, default: "")
        token = HaseStatsKeychain.string(for: Key.token) ?? ""
        isLoaded = true

        host.log.info("Hase Stats activated (configured: \(isConfigured))")

        publishActivity()
        startRefreshLoop(fetchImmediately: isConfigured)
    }

    public func deactivate() {
        // Alles, was activate() gestartet hat, endet hier: Swift kann Code
        // nicht entladen, ein laufender Timer würde bis zum Droppy-Neustart
        // weiterlaufen.
        refreshLoop?.cancel()
        refreshLoop = nil
        settingsTask?.cancel()
        settingsTask = nil
        activitySubject.send(nil)
        host = nil
    }

    // MARK: Zustand

    var isConfigured: Bool {
        !PresenceAPI.normalized(baseURL).isEmpty
            && !token.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var isOpen: Bool { status?.open == true }

    var todaySeconds: Int { status?.todaySeconds ?? 0 }

    var canToggle: Bool { isConfigured && status != nil && !isBusy }

    /// Laufende Zeit der offenen Session.
    var elapsedSeconds: Int {
        guard let started = status?.startedDate else { return 0 }
        return max(0, Int(Date().timeIntervalSince(started)))
    }

    var connectionLabel: String {
        if !isConfigured { return "Nicht eingerichtet" }
        if let errorMessage { return errorMessage }
        if status != nil { return "Verbunden" }
        return isRefreshing ? "Verbinde…" : "Unbekannt"
    }

    private var api: PresenceAPI? {
        guard isConfigured else { return nil }
        return PresenceAPI(
            baseURL: PresenceAPI.normalized(baseURL),
            token: token.trimmingCharacters(in: .whitespacesAndNewlines)
        )
    }

    // MARK: Aktionen

    /// Manuell aktualisieren (Knopf im Widget und in den Einstellungen).
    func refresh() {
        startRefreshLoop(fetchImmediately: true)
    }

    /// Ein- oder auschecken. `open` wird gesetzt, nicht umgeschaltet: ein
    /// zweiter Klick kann so nicht versehentlich zurückschalten.
    func toggle() async {
        guard let api, !isBusy else { return }
        isBusy = true
        defer { isBusy = false }

        let target = !isOpen

        do {
            let next = try await api.setPresence(open: target)
            status = next
            errorMessage = nil
            presentToggleHUD(next, checkedIn: target)
            startRefreshLoop(fetchImmediately: false)
        } catch {
            errorMessage = error.localizedDescription
            host?.log.error("toggle failed: \(error.localizedDescription)")
            presentErrorHUD(error.localizedDescription)
        }

        publishActivity()
    }

    func openSettings() {
        _ = host?.workspace.openSettings()
    }

    /// Öffnet die Profilseite im Browser — dort entsteht das Token.
    func openProfilePage() {
        let base = PresenceAPI.normalized(baseURL)
        guard !base.isEmpty, let url = URL(string: base + "/profile") else { return }
        _ = host?.workspace.open(url)
    }

    // MARK: Laden

    private var nextDelay: TimeInterval {
        if errorMessage != nil { return Interval.retry }
        return isOpen ? Interval.open : Interval.idle
    }

    private func startRefreshLoop(fetchImmediately: Bool) {
        refreshLoop?.cancel()

        guard isConfigured else {
            status = nil
            errorMessage = nil
            publishActivity()
            return
        }

        refreshLoop = Task { [weak self] in
            if fetchImmediately, let self {
                await self.fetchOnce()
            }

            while !Task.isCancelled {
                var delay = Interval.idle
                if let self { delay = self.nextDelay }

                do {
                    try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                } catch {
                    return
                }

                guard !Task.isCancelled, let self else { return }
                await self.fetchOnce()
            }
        }
    }

    private func fetchOnce() async {
        guard let api else { return }

        isRefreshing = true
        defer { isRefreshing = false }

        do {
            status = try await api.status()
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
            host?.log.error("status failed: \(error.localizedDescription)")
        }

        publishActivity()
    }

    // MARK: Einstellungen

    private func settingsChanged() {
        settingsTask?.cancel()
        settingsTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 600_000_000)
            guard !Task.isCancelled, let self else { return }
            self.persistSettings()
            self.startRefreshLoop(fetchImmediately: true)
        }
    }

    private func persistSettings() {
        host?.preferences.setValue(PresenceAPI.normalized(baseURL), forKey: Key.baseURL)
        HaseStatsKeychain.set(token, for: Key.token)
    }

    // MARK: HUD

    private func presentToggleHUD(_ status: PresenceStatus, checkedIn: Bool) {
        guard let host, host.isGranted(.hud) else { return }

        let symbol = checkedIn ? "door.left.hand.open" : "door.left.hand.closed"
        let value: String
        let label: String

        if checkedIn, let started = status.startedDate {
            value = HaseStatsFormat.clock(started)
            label = "Eingecheckt seit \(value)."
        } else {
            value = HaseStatsFormat.compact(status.todaySeconds)
            label = "Ausgecheckt. Heute \(HaseStatsFormat.duration(status.todaySeconds))."
        }

        _ = host.hud.present(
            DropletHUDRequest(
                id: "hase-stats.presence",
                duration: 3,
                priority: .normal,
                accessibilityLabel: label
            ) {
                HUDStrip(symbol: symbol, value: value)
            }
        )
    }

    private func presentErrorHUD(_ message: String) {
        guard let host, host.isGranted(.hud) else { return }

        _ = host.hud.present(
            DropletHUDRequest(
                id: "hase-stats.presence",
                duration: 3,
                priority: .normal,
                accessibilityLabel: message
            ) {
                HUDStrip(symbol: "exclamationmark.triangle", value: "Fehler")
            }
        )
    }
}

// MARK: - Shelf widget

extension HaseStatsDroplet: ShelfWidgetProviding {
    public var widgetDescriptors: [ShelfWidgetDescriptor] {
        [
            ShelfWidgetDescriptor(
                id: "presence",
                title: "Hase-Raum",
                systemImage: "door.left.hand.open",
                layoutTraits: ShelfWidgetLayoutTraits(
                    // Die Karte, nicht die Shell: Droppy legt seinen Rahmen
                    // drumherum. Beide Breiten sind Pflicht.
                    preferredSoloWidth: 420,
                    preferredPairedWidth: 210,
                    contentHeight: .fixed(150)
                ),
                searchKeywords: ["hase", "raum", "anwesenheit", "check-in"]
            )
        ]
    }

    public func makeWidgetView(_ id: ShelfWidgetID, context: ShelfWidgetContext) -> AnyView {
        AnyView(HaseStatsWidget(droplet: self, context: context))
    }

    public func makeWidgetSettingsPopover(_ id: ShelfWidgetID) -> AnyView? { nil }
}

/// Das Widget selbst. Solo und in einer Reihe sind zwei Kompositionen.
private struct HaseStatsWidget: View {
    @ObservedObject var droplet: HaseStatsDroplet
    let context: ShelfWidgetContext

    var body: some View {
        VStack(alignment: .leading, spacing: DroppySpacing.sm) {
            header
            // Nimmt die Resthöhe: so sitzt der Aktions-Knopf auf der
            // unteren Linie des Widgets statt direkt unter dem Text.
            content
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
        .padding(context.contentInsets)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }

    private var header: some View {
        HStack(spacing: DroppySpacing.xsm) {
            Image(systemName: droplet.isOpen ? "door.left.hand.open" : "door.left.hand.closed")
                .font(.system(size: 12, weight: .medium))
            Text("Hase-Raum")
                .font(.system(size: 12, weight: .semibold))
            Spacer(minLength: 0)

            if context.isCompact {
                if droplet.canToggle {
                    actionButton(diameter: 24)
                }
            } else {
                Button {
                    droplet.refresh()
                } label: {
                    Image(systemName: "arrow.clockwise")
                }
                .buttonStyle(DroppyCircleButtonStyle(size: 20))
                .help("Aktualisieren")
                .accessibilityLabel("Aktualisieren")
            }
        }
        .foregroundStyle(AdaptiveColors.notchSurfaceSecondaryText)
    }

    @ViewBuilder
    private var content: some View {
        if !droplet.isConfigured {
            setup
        } else if let status = droplet.status {
            if context.isCompact {
                compact(status)
            } else {
                solo(status)
            }
        } else if let message = droplet.errorMessage {
            failure(message)
        } else {
            loading
        }
    }

    // MARK: Zustände

    private var setup: some View {
        VStack(alignment: .leading, spacing: DroppySpacing.sm) {
            Text("Nicht verbunden")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(AdaptiveColors.notchSurfacePrimaryText)
            Text("Adresse und Token in den Einstellungen hinterlegen.")
                .font(.system(size: 11))
                .foregroundStyle(AdaptiveColors.notchSurfaceTertiaryText)
                .lineLimit(2)
            Button("Einrichten") { droplet.openSettings() }
                .buttonStyle(DroppyAccentButtonStyle(size: .small))
        }
    }

    private var loading: some View {
        Text("Lade…")
            .font(.system(size: 13))
            .foregroundStyle(AdaptiveColors.notchSurfaceSecondaryText)
    }

    private func failure(_ message: String) -> some View {
        VStack(alignment: .leading, spacing: DroppySpacing.xs) {
            Text("Keine Verbindung")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(AdaptiveColors.notchSurfacePrimaryText)
            Text(message)
                .font(.system(size: 11))
                .foregroundStyle(AdaptiveColors.notchSurfaceTertiaryText)
                .lineLimit(context.isCompact ? 2 : 1)
            if !context.isCompact {
                Button("Erneut versuchen") { droplet.refresh() }
                    .buttonStyle(DroppyAccentButtonStyle(size: .small))
            }
        }
    }

    private func compact(_ status: PresenceStatus) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(HaseStatsFormat.compact(status.todaySeconds))
                .font(.system(size: 26, weight: .semibold, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(AdaptiveColors.notchSurfacePrimaryText)
            Text(status.open ? "heute · drinnen" : "heute")
                .font(.system(size: 11))
                .foregroundStyle(AdaptiveColors.notchSurfaceTertiaryText)
                .lineLimit(1)
        }
    }

    private func solo(_ status: PresenceStatus) -> some View {
        VStack(alignment: .leading, spacing: DroppySpacing.sm) {
            Text(status.open ? "Du bist drin" : "Nicht im Raum")
                .font(.system(size: 15, weight: .semibold))
                .foregroundStyle(AdaptiveColors.notchSurfacePrimaryText)

            Text(detail(status))
                .font(.system(size: 11))
                .foregroundStyle(AdaptiveColors.notchSurfaceTertiaryText)
                .lineLimit(1)

            Spacer(minLength: 0)

            Button(status.open ? "Auschecken" : "Einchecken") {
                Task { await droplet.toggle() }
            }
            .buttonStyle(DroppyAccentButtonStyle(size: .medium))
            .disabled(droplet.isBusy)
            .accessibilityLabel(status.open ? "Auschecken" : "Einchecken")
        }
    }

    private func detail(_ status: PresenceStatus) -> String {
        let today = "heute \(HaseStatsFormat.duration(status.todaySeconds))"

        if status.open, let started = status.startedDate {
            return "seit \(HaseStatsFormat.clock(started)) · \(today)"
        }
        return today
    }

    private func actionButton(diameter: CGFloat) -> some View {
        Button {
            Task { await droplet.toggle() }
        } label: {
            Image(systemName: droplet.isOpen ? "door.left.hand.closed" : "door.left.hand.open")
        }
        .buttonStyle(DroppyCircleButtonStyle(size: diameter))
        .disabled(droplet.isBusy)
        .help(droplet.isOpen ? "Auschecken" : "Einchecken")
        .accessibilityLabel(droplet.isOpen ? "Auschecken" : "Einchecken")
    }
}

// MARK: - HUD-Streifen

/// Glyph ganz links, Wert ganz rechts: in der Mitte des Streifens sitzt auf
/// einem MacBook die Kamera, also bleibt sie leer.
private struct HUDStrip: View {
    let symbol: String
    let value: String

    var body: some View {
        HStack(spacing: 0) {
            Image(systemName: symbol)
                .font(.system(size: DroppyLiveActivityMetrics.iconSize, weight: .semibold))
            Spacer(minLength: 0)
            Text(verbatim: value)
                .font(.system(size: DroppyLiveActivityMetrics.labelFontSize, weight: .semibold))
                .monospacedDigit()
        }
        .frame(maxWidth: .infinity)
        .foregroundStyle(AdaptiveColors.notchSurfacePrimaryText)
    }
}

// MARK: - Live activity

extension HaseStatsDroplet: LiveActivityProviding {
    public var liveActivityState: AnyPublisher<LiveActivityState?, Never> {
        activitySubject.eraseToAnyPublisher()
    }

    public func makeCompactLeading() -> AnyView {
        AnyView(
            Image(systemName: isOpen ? "door.left.hand.open" : "door.left.hand.closed")
                .font(.system(size: DroppyLiveActivityMetrics.iconSize, weight: .medium))
                .foregroundStyle(AdaptiveColors.notchSurfacePrimaryText)
        )
    }

    public func makeCompactTrailing() -> AnyView {
        AnyView(
            Text(HaseStatsFormat.compact(elapsedSeconds))
                .font(.system(size: DroppyLiveActivityMetrics.labelFontSize, weight: .medium, design: .rounded))
                .monospacedDigit()
                .foregroundStyle(AdaptiveColors.notchSurfacePrimaryText)
        )
    }

    /// Wird von Droppy nicht gemountet (Hover öffnet das Shelf), bleibt aber
    /// Pflicht und zeigt dasselbe in groß.
    public func makeExpanded(context: LiveActivityContext) -> AnyView {
        AnyView(
            VStack(alignment: .leading, spacing: DroppySpacing.xs) {
                Text("Hase-Raum")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(AdaptiveColors.notchSurfaceSecondaryText)
                Text(isOpen ? "Du bist drin" : "Nicht im Raum")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(AdaptiveColors.notchSurfacePrimaryText)
                Text("heute \(HaseStatsFormat.duration(todaySeconds))")
                    .font(.system(size: 13))
                    .foregroundStyle(AdaptiveColors.notchSurfaceSecondaryText)
            }
            .frame(
                width: context.availableWidth,
                height: DroppyLiveActivityMetrics.cardContentHeight,
                alignment: .topLeading
            )
        )
    }

    private func publishActivity() {
        // Nichts zu sagen, wenn niemand drin ist: dann den Sitz freigeben.
        guard isOpen, let started = status?.startedDate else {
            activitySubject.send(nil)
            return
        }

        let elapsed = max(0, Int(Date().timeIntervalSince(started)))
        activitySubject.send(
            LiveActivityState(
                priority: 120,
                accessibilityTitle: "Im Hase-Raum seit \(HaseStatsFormat.clock(started)), \(HaseStatsFormat.duration(elapsed))",
                isInteractive: false
            )
        )
    }
}
