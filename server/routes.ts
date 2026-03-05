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

  // Admin routes
  app.get("/api/admin/bookings", isAuthenticated, async (req: any, res) => {
    // For MVP, we'll just check if authenticated, in real app check for admin role
    const allBookings = await storage.getAllBookings();
    res.json(allBookings);
  });

  // Setup seed data (run once when server starts)
  seedDatabase().catch(console.error);

  return httpServer;
}

async function seedDatabase() {
  const existingFacilities = await storage.getFacilities();
  if (existingFacilities.length === 0) {
    console.log("Seeding initial facilities...");
    
    // Badminton Courts
    await storage.createFacility({
      name: "Bedminton - Kurt 1",
      description: "Profesionálny bedmintonový kurt č. 1",
      imageUrl: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=800",
      pricePerHour: 1250, // 12.50 €
      sportType: "badminton",
      courtNumber: "Kurt 1",
    });

    await storage.createFacility({
      name: "Bedminton - Kurt 2",
      description: "Profesionálny bedmintonový kurt č. 2",
      imageUrl: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=800",
      pricePerHour: 1250, // 12.50 €
      sportType: "badminton",
      courtNumber: "Kurt 2",
    });

    // Bowling
    await storage.createFacility({
      name: "Bowlingová dráha 1",
      description: "Moderná bowlingová dráha pre skupiny",
      imageUrl: "https://images.unsplash.com/photo-1544124499-58912cbddada?auto=format&fit=crop&q=80&w=800",
      pricePerHour: 2000,
      sportType: "bowling",
      courtNumber: "Dráha 1",
    });

    // Table Tennis
    await storage.createFacility({
      name: "Stolný tenis",
      description: "Kvalitný stôl na stolný tenis",
      imageUrl: "https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&q=80&w=800",
      pricePerHour: 800,
      sportType: "table_tennis",
      courtNumber: "Stôl 1",
    });
  }
}
