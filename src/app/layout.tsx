import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Rainfall IoT Dashboard",
  description: "Monitor and analyze rainfall IoT telemetry data across companies, estates, and stations",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-[#F4F0EA] text-black font-sans selection:bg-[#FFE600] selection:text-black antialiased">
        <Sidebar />
        <div className="lg:pl-72 min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
