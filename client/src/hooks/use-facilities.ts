import { useQuery } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { Facility } from "@shared/schema";

export function useFacilities() {
  return useQuery({
    queryKey: [api.facilities.list.path],
    queryFn: async () => {
      const res = await fetch(api.facilities.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch facilities");
      const data = await res.json();
      return api.facilities.list.responses[200].parse(data);
    },
  });
}

export function useFacility(id: number) {
  return useQuery({
    queryKey: [api.facilities.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.facilities.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch facility");
      const data = await res.json();
      return api.facilities.get.responses[200].parse(data);
    },
    enabled: !!id && !isNaN(id),
  });
}
