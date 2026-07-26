export interface StorageAdapter {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

export class LocalStorageAdapter implements StorageAdapter {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }

  set(key: string, value: string): void {
    try {
      localStorage.setItem(key, value)
    } catch {
      // quota exceeded or private browsing — silently fail
    }
  }

  remove(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch {
      // silently fail
    }
  }
}
