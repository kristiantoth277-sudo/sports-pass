import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { isAuthenticated } from "./replit_integrations/auth/replitAuth";
import crypto from "crypto";

const BESTERON_API_KEY = process.env.BESTERON_API_KEY!;
const BESTERON_MERCHANT_ID = process.env.BESTERON_MERCHANT_ID!;
const BESTERON_GATE_URL = "https://gate.besteron.com/api";
const BESTERON_PASSIVE_URL = "https://passive.besteron.com/api";

async function getBesteronGateToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: BESTERON_MERCHANT_ID,
    client_secret: BESTERON_API_KEY,
  });
  const res = await fetch(`${BESTERON_GATE_URL}/oauth2/token`, {
    method: "POST",
    headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Besteron gate token error (${res.status}): ${txt}`);
  }
  const data: any = await res.json();
  return data.access_token;
}

async function getBesteronPassiveToken(): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: BESTERON_MERCHANT_ID,
    client_secret: BESTERON_API_KEY,
  });
  const res = await fetch(`${BESTERON_PASSIVE_URL}/oauth2/token`, {
    method: "POST",
    headers: { "Accept": "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Besteron passive token error (${res.status}): ${txt}`);
  }
  const data: any = await res.json();
  return data.access_token;
}

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

  // Besteron: Create payment intent and return redirect URL
  app.post("/api/bookings/:id/besteron-pay", isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Neplatné ID rezervácie" });

    const bookingWithFacility = await storage.getBooking(id);
    if (!bookingWithFacility?.booking) return res.status(404).json({ message: "Rezervácia sa nenašla" });

    const userId = req.user.claims.sub;
    if (bookingWithFacility.booking.userId !== userId) {
      return res.status(401).json({ message: "Neautorizovaný prístup k rezervácii" });
    }
    if (bookingWithFacility.booking.status === 'paid') {
      return res.status(400).json({ message: "Rezervácia je už zaplatená" });
    }

    const { booking, facility } = bookingWithFacility;
    const appUrl = `https://${req.get("host")}`;
    const returnUrl = `${appUrl}/bookings/${id}?payment=return`;

    try {
      const token = await getBesteronGateToken();
      const userClaims = req.user.claims;

      const payload = {
        totalAmount: booking.totalPrice,
        currencyCode: "EUR",
        orderNumber: `ZARAMIA${id}T${Date.now()}`,
        description: `ZaraMia rezervácia: ${facility?.name || 'Šport'}`,
        language: "SK",
        paymentMethods: ["CARD", "APPLEPAY", "GOOGLEPAY", "GIBASKBX", "TATRSKBX", "SUBASKBX", "POBNSKBA", "VIAMO"],
        buyer: {
          email: userClaims.email || undefined,
          firstName: userClaims.first_name || undefined,
          lastName: userClaims.last_name || undefined,
        },
        items: [
          {
            name: facility?.name || "Rezervácia ZaraMia",
            type: "ITEM",
            amount: booking.totalPrice,
            count: 1,
            vatRate: 20,
          },
        ],
        callback: {
          returnUrl,
        },
      };

      const response = await fetch(`${BESTERON_GATE_URL}/payment-intent`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Besteron error:", errText);
        return res.status(502).json({ message: "Chyba platobnej brány Besteron", detail: errText });
      }

      const data: any = await response.json();
      const transactionId = data.transactionId;
      const redirectUrl = data.redirectUrl;

      if (!redirectUrl) {
        return res.status(502).json({ message: "Besteron nevrátil redirectUrl" });
      }

      await storage.updateBookingPaymentId(id, transactionId);

      res.json({ redirectUrl });
    } catch (err: any) {
      console.error("Besteron fetch error:", err);
      res.status(500).json({ message: "Chyba pri komunikácii s Besteron", detail: err.message });
    }
  });

  // Besteron: Return URL handler – verify payment status
  app.get("/api/bookings/:id/besteron-verify", isAuthenticated, async (req: any, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Neplatné ID rezervácie" });

    const bookingWithFacility = await storage.getBooking(id);
    if (!bookingWithFacility?.booking) return res.status(404).json({ message: "Rezervácia sa nenašla" });

    const userId = req.user.claims.sub;
    if (bookingWithFacility.booking.userId !== userId) {
      return res.status(401).json({ message: "Neautorizovaný prístup k rezervácii" });
    }

    const { booking } = bookingWithFacility;

    if (booking.status === 'paid') {
      return res.json({ status: 'paid', qrCodeData: booking.qrCodeData });
    }

    // Besteron sends transactionId as query param on redirect — save it if present
    const transactionIdFromUrl = req.query.transactionId as string | undefined;
    if (transactionIdFromUrl && !booking.besteronPaymentId) {
      await storage.updateBookingPaymentId(id, transactionIdFromUrl);
      booking.besteronPaymentId = transactionIdFromUrl;
    }

    const transactionId = booking.besteronPaymentId || transactionIdFromUrl;
    if (!transactionId) {
      return res.status(400).json({ message: "Platba nebola inicializovaná" });
    }

    try {
      const token = await getBesteronPassiveToken();

      const response = await fetch(`${BESTERON_PASSIVE_URL}/payment-intents/${transactionId}`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("Besteron verify error:", errText);
        return res.status(502).json({ message: "Chyba overenia platby", detail: errText });
      }

      const data: any = await response.json();
      // Besteron statuses: Created, WaitingForConfirmation, Completed, Canceled, Timeouted, Error, Invalid
      const besteronStatus: string = data.transaction?.status || data.status || '';

      if (besteronStatus === 'Completed') {
        const qrData = `ZARAMIA_BOOKING_${id}_${crypto.randomBytes(8).toString('hex')}`;
        await storage.updateBookingStatus(id, 'paid', qrData);
        return res.json({ status: 'paid', qrCodeData: qrData });
      } else if (['Canceled', 'Timeouted', 'Error', 'Invalid'].includes(besteronStatus)) {
        return res.json({ status: 'failed', besteronStatus });
      } else {
        return res.json({ status: 'pending', besteronStatus });
      }
    } catch (err: any) {
      console.error("Besteron verify fetch error:", err);
      res.status(500).json({ message: "Chyba pri overovaní platby", detail: err.message });
    }
  });

  // Legacy mock pay kept as fallback (admin use)
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
      description: "Profesionálny bedmintonový kurt č. 1 v Zaramia Sport & Fun.",
      imageUrl: "/images/zaramia_hall.jpg",
      pricePerHour: 1250, // 12.50 €
      sportType: "badminton",
      courtNumber: "1",
      isComingSoon: false,
    });

    await storage.createFacility({
      name: "Badminton – Kurt 2",
      description: "Profesionálny bedmintonový kurt č. 2 v Zaramia Sport & Fun.",
      imageUrl: "/images/badminton2.jpg",
      pricePerHour: 1250, // 12.50 €
      sportType: "badminton",
      courtNumber: "2",
      isComingSoon: false,
    });

    await storage.createFacility({
      name: "Badminton – Kurt 3",
      description: "Profesionálny bedmintonový kurt č. 3 v Zaramia Sport & Fun.",
      imageUrl: "/images/zaramia_hall.jpg",
      pricePerHour: 1250, // 12.50 €
      sportType: "badminton",
      courtNumber: "3",
      isComingSoon: false,
    });

    // Bowling
    await storage.createFacility({
      name: "Bowling – Dráha 1",
      description: "Moderná bowlingová dráha č. 1. Čoskoro k dispozícii!",
      imageUrl: "/images/zaramia_bowling.jpg",
      pricePerHour: 0,
      sportType: "bowling",
      courtNumber: "1",
      isComingSoon: true,
    });

    await storage.createFacility({
      name: "Bowling – Dráha 2",
      description: "Moderná bowlingová dráha č. 2. Čoskoro k dispozícii!",
      imageUrl: "/images/zaramia_bowling.jpg",
      pricePerHour: 0,
      sportType: "bowling",
      courtNumber: "2",
      isComingSoon: true,
    });

    // Table Tennis
    await storage.createFacility({
      name: "Stolný tenis – Stôl 1",
      description: "Kvalitný stôl na stolný tenis č. 1. Čoskoro k dispozícii!",
      imageUrl: "/images/zaramia_pingpong.jpg",
      pricePerHour: 0,
      sportType: "table_tennis",
      courtNumber: "1",
      isComingSoon: true,
    });

    // VR Zone
    await storage.createFacility({
      name: "VR Zóna – Meta Quest 3",
      description: "Vstúpte do sveta virtuálnej reality s najnovšími okuliarmi Meta Quest 3. K dispozícii máme 2 súpravy pre nezabudnuteľný zážitok. Čoskoro k dispozícii!",
      imageUrl: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?auto=format&fit=crop&q=80&w=800",
      pricePerHour: 0,
      sportType: "vr",
      courtNumber: "1",
      isComingSoon: true,
    });
  }
}
