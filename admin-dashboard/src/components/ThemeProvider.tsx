"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider 
      attribute="data-theme" 
      defaultTheme="dark"
      themes={['dark', 'light', 'light-pink', 'light-green', 'light-blue', 'light-purple']}
    >
      {children}
    </NextThemesProvider>
  );
}
