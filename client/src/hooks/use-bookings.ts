import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { Booking, Facility, CreateBookingRequest } from "@shared/schema";

// Extended type because the list/get endpoints return joined data
export type BookingWithFacility = Booking & { facility: Facility };

export function useBookings() {
  return useQuery({
    queryKey: [api.bookings.list.path],
    queryFn: async () => {
      const res = await fetch(api.bookings.list.path, { credentials: "include" });
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch bookings");
      const data = await res.json();
      // Using generic parse as the schema definition used z.custom<any>()
      return api.bookings.list.responses[200].parse(data) as BookingWithFacility[];
    },
  });
}

export function useBooking(id: number) {
  return useQuery({
    queryKey: [api.bookings.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.bookings.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) throw new Error("Failed to fetch booking");
      const data = await res.json();
      return api.bookings.get.responses[200].parse(data) as BookingWithFacility;
    },
    enabled: !!id && !isNaN(id),
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateBookingRequest) => {
      const validated = api.bookings.create.input.parse(data);
      const res = await fetch(api.bookings.create.path, {
        method: api.bookings.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (res.status === 401) throw new Error("Unauthorized");
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.bookings.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create booking");
      }
      return api.bookings.create.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
    },
  });
}

export function usePayBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.bookings.pay.path, { id });
      const res = await fetch(url, {
        method: api.bookings.pay.method,
        credentials: "include",
      });
      if (res.status === 401) throw new Error("Unauthorized");
      if (res.status === 404) throw new Error("Booking not found");
      if (!res.ok) throw new Error("Payment simulation failed");
      return api.bookings.pay.responses[200].parse(await res.json());
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: [api.bookings.get.path, id] });
      queryClient.invalidateQueries({ queryKey: [api.bookings.list.path] });
    },
  });
}
