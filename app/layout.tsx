import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "中国能源价格数据库",
  description: "中国 LNG 与汽柴油批发价格的结构化查询工具。",
  openGraph: { title: "中国能源价格数据库", description: "中国 LNG 与汽柴油批发价格的结构化查询工具。", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "中国能源价格数据库", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
