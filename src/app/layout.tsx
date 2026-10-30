import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthSessionProvider } from "@/components/session-provider";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { GlobalProviders } from "@/components/global-providers";
import { FloatingAddButton } from "@/components/floating-add-button";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { WorkspaceProvider } from "@/lib/workspace-context";
import { SidebarProvider } from "@/lib/sidebar-context";
import { MainContent } from "@/components/main-content";

export const metadata = {
  title: "Flowly",
  description: "Flowly - Notes, tasks and projects in one place",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/icon.svg?v=2', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico?v=2',
    apple: '/logo.png?v=2',
  },
};

export const viewport = {
  themeColor: "#141820",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Flowly" />
      </head>
      <body className="overflow-x-hidden">
        <AuthSessionProvider>
          <ThemeProvider>
            <GlobalProviders>
              <WorkspaceProvider>
                <SidebarProvider>
                  {session?.user ? (
                    <div className="min-h-screen overflow-x-hidden">
                      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-card focus:p-3">Skip to content</a>
                      <Sidebar />
                      <MainContent>{children}</MainContent>
                      <FloatingAddButton />
                      <MobileBottomNav />
                    </div>
                  ) : (
                    <div className="min-h-screen">
                      {children}
                    </div>
                  )}
                </SidebarProvider>
              </WorkspaceProvider>
            </GlobalProviders>
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
