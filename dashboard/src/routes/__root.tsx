import { Toaster } from "Sonner";
import { ClientOnly, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { LoaderProvider } from "#/components/global/loader";
import appCss from "#/styles.css?url";

export const Route = createRootRoute({
    head: () => ({
        meta: [
            {
                charSet: "utf-8",
            },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1",
            },
            {
                title: "Chiwawa Dashboard",
            },
        ],
        links: [
            {
                rel: "stylesheet",
                href: appCss,
            },
        ],
    }),
    shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <head>
                <HeadContent />
            </head>
            <body>
                <ClientOnly>
                    <LoaderProvider>{children}</LoaderProvider>
                    <Toaster position="bottom-left" richColors />
                    <Scripts />
                </ClientOnly>
            </body>
        </html>
    );
}
