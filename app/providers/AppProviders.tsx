'use client';

import { DatasetProvider } from "./DatasetProvider";
import { ChatProvider } from "./ChatProvider";
import { ThemeProvider } from "./ThemeProvider";
import { SidebarProvider } from "./SidebarProvider";
import DashboardLayout from "../components/DashboardLayout";

interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <SidebarProvider>
        <DatasetProvider>
          <ChatProvider>
            <DashboardLayout>
              {children}
            </DashboardLayout>
          </ChatProvider>
        </DatasetProvider>
      </SidebarProvider>
    </ThemeProvider>
  );
}

