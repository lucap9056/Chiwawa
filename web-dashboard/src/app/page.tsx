"use client";
import App from "app-pages/root/App";
import { NotificationsProvider } from "app-pages/global-components/notifications";
import { LoaderProvider } from "app-pages/global-components/loader";
import { AlertsProvider } from "app-pages/global-components/alerts";
import "./i18n";

export default () => {
  return <LoaderProvider>
    <AlertsProvider>
      <NotificationsProvider>
        <App />
      </NotificationsProvider>
    </AlertsProvider>
  </LoaderProvider>
}
