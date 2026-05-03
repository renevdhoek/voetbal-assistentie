import { ref, onScopeDispose } from 'vue';

/**
 * Wake Lock helper. Vraagt scherm-wakker aan zolang de stopwatch loopt.
 * Faalt stil op browsers zonder Wake Lock API of bij policy-blokkades.
 */
class WakeLockManager {
  private sentinel: WakeLockSentinel | null = null;

  async acquire(): Promise<void> {
    try {
      if ('wakeLock' in navigator) {
        this.sentinel = await navigator.wakeLock.request('screen');
        this.sentinel.addEventListener('release', () => {
          this.sentinel = null;
        });
      }
    } catch (err) {
      console.warn('Wake Lock niet beschikbaar:', err);
    }
  }

  async release(): Promise<void> {
    try {
      await this.sentinel?.release();
    } catch {
      /* ignore */
    }
    this.sentinel = null;
  }
}

export interface UseStopwatchOptions {
  /** Initial elapsed seconds (uit DB). */
  initialSeconds?: number;
  /** Periode-lengte in seconden (mag een getter zijn voor reactieve waarden). */
  periodLengthSeconds: number | (() => number);
  /** Callback bij elke tick (per seconde) terwijl klok loopt. Voor persist. */
  onTick?: (elapsed: number) => void;
  /** Callback wanneer de periode-grens wordt bereikt; klok pauzeert eerst zelf. */
  onPeriodEnd?: () => void;
}

export function useStopwatch(opts: UseStopwatchOptions) {
  const elapsed = ref(opts.initialSeconds ?? 0);
  const isRunning = ref(false);
  const wake = new WakeLockManager();
  let intervalId: number | null = null;

  const limit = () =>
    typeof opts.periodLengthSeconds === 'function'
      ? opts.periodLengthSeconds()
      : opts.periodLengthSeconds;

  function tick() {
    elapsed.value += 1;
    opts.onTick?.(elapsed.value);
    if (elapsed.value >= limit()) {
      pause();
      opts.onPeriodEnd?.();
    }
  }

  function start() {
    if (isRunning.value) return;
    isRunning.value = true;
    intervalId = window.setInterval(tick, 1000);
    void wake.acquire();
  }

  function pause() {
    if (!isRunning.value && intervalId === null) return;
    isRunning.value = false;
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
    void wake.release();
  }

  function reset() {
    pause();
    elapsed.value = 0;
    opts.onTick?.(0);
  }

  /** Reset alleen de teller (bv. bij periode-start) zonder onTick-persist te triggeren. */
  function setElapsed(value: number) {
    elapsed.value = value;
  }

  onScopeDispose(() => {
    if (intervalId !== null) window.clearInterval(intervalId);
    void wake.release();
  });

  return {
    elapsed,
    isRunning,
    start,
    pause,
    reset,
    setElapsed,
  };
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}
