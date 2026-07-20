export class KeyedMutex {
  private locks = new Map<string, Promise<void>>();

  async acquire<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const prev = this.locks.get(key) ?? Promise.resolve();
    const next: Promise<T> = prev.then(fn, fn);
    const release = () => {
      // A tarefa anterior nao pode apagar a fila se outra tarefa para a mesma
      // chave tiver sido adicionada enquanto ela estava em execucao.
      if (this.locks.get(key) === cleanup) this.locks.delete(key);
    };
    const cleanup = next.then(release, release);
    this.locks.set(key, cleanup);
    return next;
  }

  isLocked(key: string): boolean {
    return this.locks.has(key);
  }

  get activeLocks(): number {
    return this.locks.size;
  }
}

export const mutex = new KeyedMutex();
