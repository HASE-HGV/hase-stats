// Dedicated kiosk layout — no nav, no padding, no auth chrome.
export default function DisplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
