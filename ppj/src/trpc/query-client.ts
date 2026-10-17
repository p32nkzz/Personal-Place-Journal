import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from "@tanstack/react-query";
import SuperJSON from "superjson";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
        // Error yang pasti (data tidak ditemukan, tidak berhak, input salah) tidak perlu dicoba ulang:
        // pesan "tidak ditemukan" langsung tampil. Error lain (jaringan/server) tetap dicoba ulang hingga 3x.
        retry: (count, error) => {
          const code = (error as { data?: { code?: string } } | null)?.data?.code;
          if (code && ["NOT_FOUND", "FORBIDDEN", "UNAUTHORIZED", "BAD_REQUEST"].includes(code)) return false;
          return count < 3;
        },
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
  });
