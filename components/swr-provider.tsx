"use client";

import { SWRConfig } from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function SWRProvider({ children }: { children: React.ReactNode }) {
    return (
        <SWRConfig
            value={{
                fetcher,
                refreshInterval: 0,
                revalidateOnFocus: false,
                keepPreviousData: true,
            }}
        >
            {children}
        </SWRConfig>
    );
}
