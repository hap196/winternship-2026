// Stub for removed language functionality - just returns English text as-is
export function useLanguage() {
  return {
    language: 'en',
    setLanguage: () => {},
    t: (key: string, defaultValue?: string) => defaultValue || key,
  };
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

