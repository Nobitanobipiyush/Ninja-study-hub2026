import "./globals.css";

export const metadata = {
  title: process.env.NEXT_PUBLIC_SITE_TITLE || "Video Library",
  description: "Bunny Stream Video Library"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
