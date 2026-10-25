import { Injectable, signal, computed, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'medilog_theme';

  // Current theme mode selected by user: 'light', 'dark', or 'system'
  themeMode = signal<ThemeMode>(this.getInitialThemeMode());

  // System OS preference signal
  private systemPrefersDark = signal<boolean>(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );

  // Resolved effective theme ('light' or 'dark')
  effectiveTheme = computed<EffectiveTheme>(() => {
    const mode = this.themeMode();
    if (mode === 'system') {
      return this.systemPrefersDark() ? 'dark' : 'light';
    }
    return mode;
  });

  constructor() {
    // Setup listener for OS color scheme changes
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = (e: MediaQueryListEvent) => {
        this.systemPrefersDark.set(e.matches);
      };
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', listener);
      } else {
        mediaQuery.addListener(listener);
      }
    }

    // Effect to apply data-theme attribute on documentElement and body whenever effectiveTheme changes
    effect(() => {
      const theme = this.effectiveTheme();
      if (typeof document !== 'undefined') {
        document.documentElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
        
        if (theme === 'dark') {
          document.documentElement.classList.add('dark-theme');
          document.documentElement.classList.remove('light-theme');
          document.body.classList.add('dark-theme');
          document.body.classList.remove('light-theme');
        } else {
          document.documentElement.classList.add('light-theme');
          document.documentElement.classList.remove('dark-theme');
          document.body.classList.add('light-theme');
          document.body.classList.remove('dark-theme');
        }
      }
    });
  }

  setThemeMode(mode: ThemeMode): void {
    this.themeMode.set(mode);
    try {
      localStorage.setItem(this.STORAGE_KEY, mode);
    } catch (e) {
      console.warn('Unable to persist theme to localStorage', e);
    }
  }

  private getInitialThemeMode(): ThemeMode {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem(this.STORAGE_KEY) as ThemeMode;
      if (saved && (saved === 'light' || saved === 'dark' || saved === 'system')) {
        return saved;
      }
    }
    // Default to 'dark' or 'system' as requested
    return 'dark';
  }
}
