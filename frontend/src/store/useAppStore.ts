import { create } from 'zustand';
import type { Booking, QueueItem } from '@/types';

interface AppState {
  currentRole: 'FORWARDER' | 'WAREHOUSE' | 'SECURITY' | 'ADMIN';
  currentUser: { id: string; name: string };
  selectedBooking: Booking | null;
  queueList: QueueItem[];
  setCurrentRole: (role: AppState['currentRole']) => void;
  setCurrentUser: (user: AppState['currentUser']) => void;
  setSelectedBooking: (booking: Booking | null) => void;
  setQueueList: (list: QueueItem[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentRole: 'FORWARDER',
  currentUser: { id: 'U001', name: '测试用户' },
  selectedBooking: null,
  queueList: [],
  setCurrentRole: (role) => set({ currentRole: role }),
  setCurrentUser: (user) => set({ currentUser: user }),
  setSelectedBooking: (booking) => set({ selectedBooking: booking }),
  setQueueList: (list) => set({ queueList: list }),
}));
