import { createRootRoute, Outlet } from '@tanstack/react-router';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { BottomNav } from '../components/BottomNav';
import { VoiceAssistant } from '../components/VoiceAssistant';
import { authClient } from '@/lib/auth-client';
import { useAuthStore } from '@/store/auth';

export const Route = createRootRoute({
  beforeLoad: async () => {
    if (useAuthStore.getState().user) return;
    try {
      const session = await authClient.getSession();
      const u = session?.data?.user;
      if (u) {
        useAuthStore.getState()._setUser({
          id: u.id,
          email: u.email,
          name: u.name ?? '',
          role: (u as { role?: string }).role ?? 'user',
        });
      }
    } catch (_notAuthenticated) {}
  },
  component: () => (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      <Header />
      <main className="flex-1 w-full max-w-[100vw] overflow-x-hidden pb-20 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <BottomNav />
      <VoiceAssistant />
    </div>
  ),
});
