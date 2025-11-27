import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ComponentProps } from "react";

export function ThemeProvider({
    children,
    ...props
}: ComponentProps<typeof NextThemesProvider>) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            {...props}
        >
            {children}
        </NextThemesProvider>
    );
}

export { useTheme } from "next-themes";
