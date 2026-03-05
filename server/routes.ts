import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { isAuthenticated } from "./replit_integrations/auth/replitAuth";
import crypto from "crypto";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "zaramia2024";
const ENABLE_SHELLY = process.env.ENABLE_SHELLY === "true";

export function isAdmin(req: Request, res: Response, next: NextFunction) {
  const adminAuth = req.headers["x-admin-password"];
  if (adminAuth === ADMIN_PASSWORD) {
    return next();
  }
  res.status(401).json({ message: "Neautorizovaný prístup správcu" });
}

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
      return res.status(400).json({ message: "Neplatné ID zariadenia" });
    }
    const facility = await storage.getFacility(id);
    if (!facility) {
      return res.status(404).json({ message: "Zariadenie sa nenašlo" });
    }
    res.json(facility);
  });

  // Bookings
  app.get(api.bookings.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.claims.sub;
    const userBookings = await storage.getBookingsByUserId(userId);
    const flattenedBookings = userBookings.map(b => ({
      ...b.booking,
      facility: b.facility
    }));
    res.json(flattenedBookings);
  });

  app.get(api.bookings.get.path, isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Neplatné ID rezervácie" });
    }

    const bookingWithFacility = await storage.getBooking(id);
    if (!bookingWithFacility || !bookingWithFacility.booking) {
      return res.status(404).json({ message: "Rezervácia sa nenašla" });
    }

    const userId = req.user.claims.sub;
    if (bookingWithFacility.booking.userId !== userId) {
      return res.status(401).json({ message: "Neautorizovaný prístup k rezervácii" });
    }

    res.json({
      ...bookingWithFacility.booking,
      facility: bookingWithFacility.facility
    });
  });

  app.post(api.bookings.create.path, isAuthenticated, async (req: any, res) => {
    try {
      const parsedBody = api.bookings.create.input.parse(req.body);
      const userId = req.user.claims.sub;

      const newBooking = await storage.createBooking({
        ...parsedBody,
        userId,
        status: "reserved"
      });

      res.status(201).json(newBooking);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      res.status(500).json({ message: "Nepodarilo sa vytvoriť rezerváciu" });
    }
  });

  app.post(api.bookings.pay.path, isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Neplatné ID rezervácie" });
    }

    const bookingWithFacility = await storage.getBooking(id);
    if (!bookingWithFacility || !bookingWithFacility.booking) {
      return res.status(404).json({ message: "Rezervácia sa nenašla" });
    }

    const userId = req.user.claims.sub;
    if (bookingWithFacility.booking.userId !== userId) {
      return res.status(401).json({ message: "Neautorizovaný prístup k rezervácii" });
    }

    if (bookingWithFacility.booking.status === 'paid') {
      return res.status(400).json({ message: "Rezervácia je už zaplatená" });
    }

    const qrData = `ZARAMIA_BOOKING_${id}_${crypto.randomBytes(8).toString('hex')}`;
    const updated = await storage.updateBookingStatus(id, "paid", qrData);
    
    if (!updated) {
      return res.status(500).json({ message: "Nepodarilo sa aktualizovať stav rezervácie" });
    }

    res.json({ success: true, qrCodeData: qrData });
  });

  // Admin routes
  app.get("/api/admin/bookings", isAuthenticated, isAdmin, async (req, res) => {
    const allBookings = await storage.getAllBookings();
    res.json(allBookings);
  });

  app.get("/api/admin/shelly/settings", isAuthenticated, isAdmin, async (req, res) => {
    const settings = await storage.getShellySettings();
    res.json(settings);
  });

  app.post("/api/admin/shelly/settings", isAuthenticated, isAdmin, async (req, res) => {
    const { key, value } = req.body;
    await storage.updateShellySetting(key, value);
    res.json({ success: true });
  });

  app.post("/api/admin/shelly/control", isAuthenticated, isAdmin, async (req, res) => {
    if (!ENABLE_SHELLY) {
      return res.status(400).json({ message: "Ovládanie Shelly je momentálne zakázané (ENABLE_SHELLY=false)" });
    }
    const { zone, action } = req.body;
    // Mock control logic
    console.log(`Shelly Control: Zone ${zone}, Action ${action}`);
    res.json({ success: true, message: `Zóna ${zone} bola ${action === 'on' ? 'zapnutá' : 'vypnutá'}` });
  });

  seedDatabase().catch(console.error);

  return httpServer;
}

async function seedDatabase() {
  const existingFacilities = await storage.getFacilities();
  if (existingFacilities.length === 0) {
    console.log("Seeding initial facilities...");
    
    // Badminton Courts
    await storage.createFacility({
      name: "Badminton – Kurt 1",
      description: "Profesionálny bedmintonový kurt č. 1 v Bowl center s.r.o.",
      imageUrl: "/images/badminton1.jpg",
      pricePerHour: 1250, // 12.50 €
      sportType: "badminton",
      courtNumber: "1",
      isComingSoon: false,
    });

    await storage.createFacility({
      name: "Badminton – Kurt 2",
      description: "Profesionálny bedmintonový kurt č. 2 v Bowl center s.r.o.",
      imageUrl: "/images/badminton2.jpg",
      pricePerHour: 1250, // 12.50 €
      sportType: "badminton",
      courtNumber: "2",
      isComingSoon: false,
    });

    await storage.createFacility({
      name: "Badminton – Kurt 3",
      description: "Profesionálny bedmintonový kurt č. 3 v Bowl center s.r.o.",
      imageUrl: "/images/badminton1.jpg",
      pricePerHour: 1250, // 12.50 €
      sportType: "badminton",
      courtNumber: "3",
      isComingSoon: false,
    });

    // Bowling
    await storage.createFacility({
      name: "Bowling – Dráha 1",
      description: "Moderná bowlingová dráha č. 1. Čoskoro k dispozícii!",
      imageUrl: "https://images.unsplash.com/photo-1544124499-58912cbddada?auto=format&fit=crop&q=80&w=800",
      pricePerHour: 0,
      sportType: "bowling",
      courtNumber: "1",
      isComingSoon: true,
    });

    await storage.createFacility({
      name: "Bowling – Dráha 2",
      description: "Moderná bowlingová dráha č. 2. Čoskoro k dispozícii!",
      imageUrl: "https://images.unsplash.com/photo-1544124499-58912cbddada?auto=format&fit=crop&q=80&w=800",
      pricePerHour: 0,
      sportType: "bowling",
      courtNumber: "2",
      isComingSoon: true,
    });

    // Table Tennis
    await storage.createFacility({
      name: "Stolný tenis – Stôl 1",
      description: "Kvalitný stôl na stolný tenis č. 1. Čoskoro k dispozícii!",
      imageUrl: "https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&q=80&w=800",
      pricePerHour: 0,
      sportType: "table_tennis",
      courtNumber: "1",
      isComingSoon: true,
    });
  }
}
