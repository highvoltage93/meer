type MeetingEventListener = (snapshot: unknown) => void;

export class MeetingEventsService {
  private listeners = new Map<string, Set<MeetingEventListener>>();

  subscribe(meetingId: string, listener: MeetingEventListener) {
    const current = this.listeners.get(meetingId) ?? new Set<MeetingEventListener>();
    current.add(listener);
    this.listeners.set(meetingId, current);

    return () => {
      const next = this.listeners.get(meetingId);
      if (!next) return;
      next.delete(listener);
      if (!next.size) {
        this.listeners.delete(meetingId);
      }
    };
  }

  publish(meetingId: string, snapshot: unknown) {
    const listeners = this.listeners.get(meetingId);
    if (!listeners) return;

    for (const listener of Array.from(listeners)) {
      try {
        listener(snapshot);
      } catch {
        listeners.delete(listener);
      }
    }
  }
}
