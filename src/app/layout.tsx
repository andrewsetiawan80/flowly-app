import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthSessionProvider } from "@/components/session-provider";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { GlobalProviders } from "@/components/global-providers";
import { FloatingAddButton } from "@/components/floating-add-button";

export const metadata = {
  title: "Flowly",
  description: "Flowly - Your elegant task management companion",
  manifest: "/manifest.json",
  themeColor: "#f97316",
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
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
              {session?.user ? (
                <div className="min-h-screen overflow-x-hidden">
                  <Sidebar />
                  {/* Main content - responsive padding */}
                  <main className="min-h-screen pt-16 pb-20 lg:pt-0 lg:pb-0 lg:pl-[288px] bg-background transition-all duration-300">
                    <div className="w-full max-w-4xl mx-auto py-4 px-3 sm:py-6 sm:px-6 lg:py-10 lg:px-8 xl:px-12">
                      {children}
                    </div>
                  </main>
                  <FloatingAddButton />
                </div>
              ) : (
                <div className="min-h-screen">
                  {children}
                </div>
              )}
            </GlobalProviders>
          </ThemeProvider>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
