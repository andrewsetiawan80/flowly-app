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
  description: "Flowly - Your elegant task management companion",
  manifest: "/manifest.json",
  themeColor: "#f97316",
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
};

export const viewport = {
  themeColor: "#f97316",
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
      <body className="noise-overlay overflow-x-hidden">
        <AuthSessionProvider>
          <ThemeProvider>
            <GlobalProviders>
              <WorkspaceProvider>
                <SidebarProvider>
                  {session?.user ? (
                    <div className="min-h-screen overflow-x-hidden">
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
