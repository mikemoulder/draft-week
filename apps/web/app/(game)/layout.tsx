import { AppNav } from "@/components/game/app-nav";
import { SessionProvider } from "@/components/session";

// The game screens share the signed-in session and the app nav. The landing page stays static.
export default function GameLayout({ children }: LayoutProps<"/">) {
  return (
    <SessionProvider>
      <AppNav />
      <main className="flex-1">{children}</main>
    </SessionProvider>
  );
}
