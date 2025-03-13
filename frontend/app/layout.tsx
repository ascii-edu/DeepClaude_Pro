import type { Metadata } from "next"
import { Toaster } from "../components/ui/toaster"
import { PostHogProvider } from "../providers/posthog"
import "./globals.css"

export const metadata: Metadata = {
  title: "DeepClaude Pro",
  description: "DeepClaude Pro - 高级AI助手",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-background min-h-screen antialiased" suppressHydrationWarning>
        <PostHogProvider>
          {children}
          <Toaster />
        </PostHogProvider>
      </body>
    </html>
  )
}
