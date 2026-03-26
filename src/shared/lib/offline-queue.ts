import { storage } from './mmkv';

const QUEUE_KEY = 'offline_queue';
const MAX_QUEUE_SIZE = 50;

export interface QueuedMutation {
  id: string;
  type: string;
  payload: any;
  createdAt: string;
  retryCount: number;
}

function getQueue(): QueuedMutation[] {
  const raw = storage.getString(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedMutation[]): void {
  storage.set(QUEUE_KEY, JSON.stringify(queue));
}

export function enqueue(mutation: Omit<QueuedMutation, 'retryCount'>): void {
  const queue = getQueue();
  if (queue.length >= MAX_QUEUE_SIZE) {
    console.warn('Offline queue full, dropping oldest entry');
    queue.shift();
  }
  // Dedup by id
  const filtered = queue.filter((m) => m.id !== mutation.id);
  filtered.push({ ...mutation, retryCount: 0 });
  saveQueue(filtered);
}

export function dequeue(id: string): void {
  const queue = getQueue().filter((m) => m.id !== id);
  saveQueue(queue);
}

export function getQueueSize(): number {
  return getQueue().length;
}

export function getPendingMutations(): QueuedMutation[] {
  return getQueue();
}

export function clearQueue(): void {
  storage.delete(QUEUE_KEY);
}

export function incrementRetry(id: string): void {
  const queue = getQueue().map((m) =>
    m.id === id ? { ...m, retryCount: m.retryCount + 1 } : m
  );
  saveQueue(queue);
}
