/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useCallback } from "react";

interface ServiceInterface<T> {
  getAll: () => T[] | Promise<T[]>;
  create: (data: any) => any;
  update: (id: string | number, data: any) => any;
  remove: (id: string | number) => boolean | Promise<boolean>;
}

export function useStorage<T extends { id?: string | number }>(
  service: ServiceInterface<T>
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = service.getAll();
      const items = res && typeof (res as any).then === "function" ? await res : res;
      setData((items as T[]) || []);
    } catch (error) {
      console.error("Failed to load storage data", error);
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    const timer = setTimeout(() => {
      refresh();
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const createItem = async (item: Omit<T, "id">) => {
    const res = service.create(item);
    const newItem = res && typeof (res as any).then === "function" ? await res : res;
    await refresh();
    return newItem;
  };

  const updateItem = async (id: string | number, updatedData: Partial<T>) => {
    const res = service.update(id, updatedData);
    const updated = res && typeof (res as any).then === "function" ? await res : res;
    await refresh();
    return updated;
  };

  const removeItem = async (id: string | number) => {
    const res = service.remove(id);
    const success = res && typeof (res as any).then === "function" ? await res : res;
    await refresh();
    return success;
  };

  return {
    data,
    loading,
    refresh,
    create: createItem,
    update: updateItem,
    remove: removeItem,
  };
}
