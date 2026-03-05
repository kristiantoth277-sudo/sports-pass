import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { isAuthenticated } from "./replit_integrations/auth/replitAuth";
import crypto from "crypto";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Facilities
  app.get(api.facilities.list.path, async (req, res) => {
    const allFacilities = await storage.getFacilities();
    res.json(allFacilities);
  });

  app.get(api.facilities.get.path, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid facility ID" });
    }
    const facility = await storage.getFacility(id);
    if (!facility) {
      return res.status(404).json({ message: "Facility not found" });
    }
    res.json(facility);
  });

  // Bookings
  app.get(api.bookings.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const userBookings = await storage.getBookingsByUserId(userId);
    // Flatten the joined result for easier consumption by frontend
    const flattenedBookings = userBookings.map(b => ({
      ...b.booking,
      facility: b.facility
    }));
    res.json(flattenedBookings);
  });

  app.get(api.bookings.get.path, isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const bookingWithFacility = await storage.getBooking(id);
    if (!bookingWithFacility || !bookingWithFacility.booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const userId = req.user.claims.sub;
    if (bookingWithFacility.booking.userId !== userId) {
      return res.status(401).json({ message: "Unauthorized access to booking" });
    }

    res.json({
      ...bookingWithFacility.booking,
      facility: bookingWithFacility.facility
    });
  });

  app.post(api.bookings.create.path, isAuthenticated, async (req: any, res) => {
    try {
      // Create request uses the partial zod schema and we coerce dates
      const parsedBody = api.bookings.create.input.parse(req.body);
      const userId = req.user.claims.sub;

      const newBooking = await storage.createBooking({
        ...parsedBody,
        userId
      });

      res.status(201).json(newBooking);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  // Simulated Payment Endpoint
  app.post(api.bookings.pay.path, isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid booking ID" });
    }

    const bookingWithFacility = await storage.getBooking(id);
    if (!bookingWithFacility || !bookingWithFacility.booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const userId = req.user.claims.sub;
    if (bookingWithFacility.booking.userId !== userId) {
      return res.status(401).json({ message: "Unauthorized access to booking" });
    }

    if (bookingWithFacility.booking.status === 'paid') {
      return res.status(400).json({ message: "Booking is already paid" });
    }

    // Simulate payment success and generate QR code data
    const qrData = `SPORT_BOOKING_${id}_${crypto.randomBytes(8).toString('hex')}`;
    
    const updated = await storage.updateBookingStatus(id, "paid", qrData);
    
    if (!updated) {
      return res.status(500).json({ message: "Failed to update booking status" });
    }

    res.json({ success: true, qrCodeData: qrData });
  });

  // Setup seed data (run once when server starts)
  seedDatabase().catch(console.error);

  return httpServer;
}

async function seedDatabase() {
  const existingFacilities = await storage.getFacilities();
  if (existingFacilities.length === 0) {
    console.log("Seeding initial facilities...");
    await storage.createFacility({
      name: "Downtown Tennis Court",
      description: "Professional grade hard court located in the city center. Features floodlights for evening play.",
      imageUrl: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&q=80&w=800",
      pricePerHour: 2500, // $25.00
      sportType: "tennis",
    });

    await storage.createFacility({
      name: "Riverside Basketball Arena",
      description: "Indoor hardwood court with full sizing. Air conditioned and locker rooms available.",
      imageUrl: "https://images.unsplash.com/photo-1505666287802-931dc83948e9?auto=format&fit=crop&q=80&w=800",
      pricePerHour: 3500, // $35.00
      sportType: "basketball",
    });

    await storage.createFacility({
      name: "Greenfield Turf 5v5",
      description: "Premium artificial turf field perfect for 5-a-side football matches. Includes goal posts and nets.",
      imageUrl: "https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&q=80&w=800",
      pricePerHour: 4000, // $40.00
      sportType: "football",
    });
  }
}
