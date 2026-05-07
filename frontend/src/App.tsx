// frontend/src/App.tsx
import { ConfigProvider, App as AntApp } from 'antd';
import itIT from 'antd/locale/it_IT';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { useEffect } from 'react';
import { antdTheme } from './config/antd-theme';
import { router } from './router';
import { setNotifyCallback } from './api/client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

function AppInner() {
  const { notification: notif } = AntApp.useApp();

  useEffect(() => {
    setNotifyCallback((type, message, description) => {
      if (type === 'error') notif.error({ message, description, duration: 5 });
      else notif.warning({ message, description, duration: 4 });
    });
  }, [notif]);

  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={antdTheme} locale={itIT}>
        <AntApp>
          <AppInner />
        </AntApp>
      </ConfigProvider>
    </QueryClientProvider>
  );
}
