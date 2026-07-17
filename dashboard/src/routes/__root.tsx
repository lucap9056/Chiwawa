import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import "#/i18n";
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
            {
                rel: "icon",
                type: "image/x-icon",
                href: `${import.meta.env.BASE_URL}favicon.ico`,
            },
            {
                rel: "stylesheet",
                href: "https://fonts.googleapis.com/css2?family=Poetsen+One&family=Ubuntu:wght@400;700&display=swap",
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
                {children}
                <Scripts />
            </body>
        </html>
    );
}
