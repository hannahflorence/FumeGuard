import { useEffect, useState } from "react";
import {
  limitToLast,
  onValue,
  orderByChild,
  query,
  ref,
} from "firebase/database";
import type { LatestReading, SessionRecord, StoredEvent } from "@fumeguard/shared";
import { db, DEVICE_ID } from "../lib/firebase";

export function useLatest() {
  const [data, setData] = useState<LatestReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const r = ref(db, `devices/${DEVICE_ID}/latest`);
    const unsub = onValue(
      r,
      (snap) => {
        setData(snap.exists() ? (snap.val() as LatestReading) : null);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  return { data, loading, error };
}

export function useHistory(limit = 60) {
  const [data, setData] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = ref(db, `devices/${DEVICE_ID}/history`);
    const q = query(r, orderByChild("ts"), limitToLast(limit));
    const unsub = onValue(q, (snap) => {
      const points: HistoryPoint[] = [];
      snap.forEach((child) => {
        const v = child.val() as LatestReading;
        points.push({ id: child.key!, ...v });
      });
      points.sort((a, b) => a.ts - b.ts);
      setData(points);
      setLoading(false);
    });
    return () => unsub();
  }, [limit]);

  return { data, loading };
}

export interface HistoryPoint extends LatestReading {
  id: string;
}

export function useSessions() {
  const [data, setData] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = ref(db, `devices/${DEVICE_ID}/sessions`);
    const unsub = onValue(r, (snap) => {
      const list: SessionRecord[] = [];
      snap.forEach((child) => {
        list.push(child.val() as SessionRecord);
      });
      list.sort((a, b) => (b.startedAt ?? 0) - (a.startedAt ?? 0));
      setData(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { data, loading };
}

export function useEvents(limit = 20) {
  const [data, setData] = useState<(StoredEvent & { id: string })[]>([]);

  useEffect(() => {
    const r = ref(db, `devices/${DEVICE_ID}/events`);
    const q = query(r, orderByChild("ts"), limitToLast(limit));
    const unsub = onValue(q, (snap) => {
      const list: (StoredEvent & { id: string })[] = [];
      snap.forEach((child) => {
        list.push({ id: child.key!, ...(child.val() as StoredEvent) });
      });
      list.sort((a, b) => b.ts - a.ts);
      setData(list);
    });
    return () => unsub();
  }, [limit]);

  return { data };
}

export function useFilteredHistory(
  allHistory: HistoryPoint[],
  fromTs: number | null,
  toTs: number | null
) {
  return allHistory.filter((p) => {
    if (fromTs && p.ts < fromTs) return false;
    if (toTs && p.ts > toTs) return false;
    return true;
  });
}
