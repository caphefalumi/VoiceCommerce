import { createRootRoute, Outlet } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { BottomNav } from '../components/BottomNav';
import { VoiceAssistant } from '../components/VoiceAssistant';

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      <Header />
      <main className="flex-1 w-full max-w-[100vw] overflow-x-hidden">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
      <VoiceAssistant />
      <TanStackRouterDevtools />
    </div>
  ),
});
