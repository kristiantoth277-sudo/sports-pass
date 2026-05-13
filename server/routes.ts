import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { facilities } from "@shared/schema";
import { eq } from "drizzle-orm";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replit_integrations/auth/replitAuth";
import { registerAuthRoutes } from "./replit_integrations/auth/routes";
import crypto from "crypto";
import { sendBookingNotification } from "./emailNotification";
import path from "path";
import fsSync from "fs";

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
  const clientId = process.env.BESTERON_PASSIVE_MERCHANT_ID || BESTERON_MERCHANT_ID;
  const clientSecret = process.env.BESTERON_PASSIVE_API_KEY || BESTERON_API_KEY;
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
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

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ENABLE_SHELLY = process.env.ENABLE_SHELLY === "true";

export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!ADMIN_PASSWORD) {
    return res.status(503).json({ message: "Admin authentication not configured" });
  }
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
  await setupAuth(app);
  registerAuthRoutes(app);

  // Serve /images/ explicitly — works in both dev and prod regardless of __dirname quirks
  const imageRoots = [
    path.resolve(process.cwd(), "dist", "public", "images"),
    path.resolve(process.cwd(), "client", "public", "images"),
  ];
  app.get("/images/:file", (req, res) => {
    const file = req.params.file.replace(/[^a-zA-Z0-9._-]/g, "");
    for (const dir of imageRoots) {
      const full = path.join(dir, file);
      if (fsSync.existsSync(full)) {
        return res.sendFile(full);
      }
    }
    res.status(404).send("Image not found");
  });
  console.log("[images] Searching in:", imageRoots.filter(d => fsSync.existsSync(d)));

  // Facilities
  app.get(api.facilities.list.path, async (req, res) => {
    const allFacilities = await storage.getFacilities();
    res.json(allFacilities);
  });

  // Check if any badminton court is available (for bowling/table tennis availability condition)
  // Must be registered BEFORE the :id route to avoid being matched as an ID
  app.get("/api/facilities/badminton-available", async (req, res) => {
    const now = new Date();
    const allFacilities = await storage.getFacilities();
    const badmintonCourts = allFacilities.filter(f => f.sportType === 'badminton');
    const allBookings = await storage.getAllBookings();
    const activeNow = allBookings.filter(({ booking }: any) =>
      booking.status !== 'cancelled' &&
      new Date(booking.startTime) <= now &&
      new Date(booking.endTime) > now
    );
    const bookedFacilityIds = new Set(activeNow.map(({ booking }: any) => booking.facilityId));
    const anyFree = badmintonCourts.some(c => !bookedFacilityIds.has(c.id));
    res.json({ available: anyFree });
  });

  // Bookings
  app.get(api.bookings.list.path, isAuthenticated, async (req: any, res) => {
    const userId = req.user.id;
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

    const userId = req.user.id;
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
      const userId = req.user.id;

      // For bowling and table tennis: require at least one free badminton court
      const facility = await storage.getFacility(parsedBody.facilityId);
      if (facility && (facility.sportType === 'bowling' || facility.sportType === 'table_tennis')) {
        const now = new Date();
        const allFacilities = await storage.getFacilities();
        const badmintonCourts = allFacilities.filter(f => f.sportType === 'badminton');
        const allBookings = await storage.getAllBookings();
        const activeNow = allBookings.filter(({ booking }: any) =>
          booking.status !== 'cancelled' &&
          new Date(booking.startTime) <= now &&
          new Date(booking.endTime) > now
        );
        const bookedFacilityIds = new Set(activeNow.map(({ booking }: any) => booking.facilityId));
        const anyFree = badmintonCourts.some(c => !bookedFacilityIds.has(c.id));
        if (!anyFree) {
          return res.status(400).json({ message: "Bowling a stolný tenis sú dostupné iba ak je voľný aspoň jeden badmintonový kurt." });
        }
      }

      const newBooking = await storage.createBooking({
        ...parsedBody,
        userId,
        status: "reserved"
      });

      // Send email notification (non-blocking)
      const userClaims = (req as any).user;
      sendBookingNotification({
        id: newBooking.id,
        facilityName: facility?.name ?? `Zariadenie #${parsedBody.facilityId}`,
        sportType: facility?.sportType ?? "badminton",
        startTime: new Date(newBooking.startTime),
        endTime: new Date(newBooking.endTime),
        totalPrice: newBooking.totalPrice,
        userName: (`${userClaims?.firstName ?? ""} ${userClaims?.lastName ?? ""}`.trim()) || (userClaims?.email ?? undefined),
        userEmail: userClaims?.email ?? undefined,
      }).catch(err => console.error("[Email] notification failed:", err));

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

    const userId = req.user.id;
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
      const userClaims = req.user;

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

    const userId = req.user.id;
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
      // Try passive token first; fall back to gate token if passive credentials aren't configured
      let token: string;
      try {
        token = await getBesteronPassiveToken();
      } catch (tokenErr: any) {
        console.warn("Passive token failed, falling back to gate token:", tokenErr.message);
        token = await getBesteronGateToken();
      }

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

    const userId = req.user.id;
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

  app.get("/api/admin/ping", isAdmin, (_req, res) => res.json({ ok: true }));

  app.post("/api/admin/test-email", isAdmin, async (_req, res) => {
    try {
      await sendBookingNotification({
        id: 9999,
        facilityName: "Test – Badminton Kurt 1",
        sportType: "badminton",
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        totalPrice: 1250,
        userName: "Test zákazník",
        userEmail: "test@example.com",
      });
      res.json({ ok: true, message: "Testovací email odoslaný" });
    } catch (err: any) {
      res.status(500).json({ ok: false, message: err.message });
    }
  });

  app.post("/api/admin/facilities/:id/set-available", isAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Neplatné ID" });
    const { isComingSoon, pricePerHour } = req.body;
    await db.update(facilities)
      .set({
        ...(typeof isComingSoon === 'boolean' && { isComingSoon }),
        ...(typeof pricePerHour === 'number' && { pricePerHour }),
      })
      .where(eq(facilities.id, id));
    res.json({ success: true });
  });

  app.get("/api/admin/besteron-check/:transactionId", isAdmin, async (req, res) => {
    const { transactionId } = req.params;
    try {
      let token: string;
      try {
        token = await getBesteronPassiveToken();
      } catch {
        token = await getBesteronGateToken();
      }
      const response = await fetch(`${BESTERON_PASSIVE_URL}/payment-intents/${transactionId}`, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
      });
      const text = await response.text();
      res.json({ httpStatus: response.status, body: text });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/bookings/:id/mark-paid", isAuthenticated, isAdmin, async (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Neplatné ID rezervácie" });
    const bookingWithFacility = await storage.getBooking(id);
    if (!bookingWithFacility?.booking) return res.status(404).json({ message: "Rezervácia sa nenašla" });
    if (bookingWithFacility.booking.status === 'paid') {
      return res.status(400).json({ message: "Rezervácia je už zaplatená" });
    }
    const qrData = `ZARAMIA_BOOKING_${id}_${crypto.randomBytes(8).toString('hex')}`;
    const updated = await storage.updateBookingStatus(id, "paid", qrData);
    if (!updated) return res.status(500).json({ message: "Nepodarilo sa aktualizovať stav" });
    res.json({ success: true, qrCodeData: qrData });
  });

  // Known device data (Shelly 1 PM Mini Gen 4) — seeded from device info screenshots
  const KNOWN_DEVICES: Record<string, { ip: string; id: string }> = {
    'Svetlo hala': { ip: '192.168.0.160', id: 'e4b0636a5bc8' },
    'Hala2':       { ip: '192.168.0.161', id: 'e4b063740efc' },
    'Hala3':       { ip: '192.168.0.163', id: 'e4b06375cb3c' },
    'Bar bar':     { ip: '192.168.0.164', id: 'e4b063787f7c' },
  };

  // Helper: zone name → settings key
  const zoneKey = (zone: string) => zone.toLowerCase().replace(/\s+/g, '_') + '_ip';

  // Helper: get zone IP — from DB or fallback to known devices
  async function getZoneConfig(zone: string, settings: any[]): Promise<{ ip: string; id: string }> {
    const getSetting = (k: string) => settings.find((s: any) => s.key === k)?.value || '';
    const ip = getSetting(zoneKey(zone)) || KNOWN_DEVICES[zone]?.ip || '';
    const idKey = zoneKey(zone).replace('_ip', '_id');
    const id = getSetting(idKey) || KNOWN_DEVICES[zone]?.id || '';
    return { ip, id };
  }

  // Helper: call Shelly Gen2 local HTTP RPC API
  async function shellyGen2Request(ip: string, method: string, params: Record<string, any>): Promise<{ ok: boolean; data?: any; error?: string }> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const paramStr = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
      const r = await fetch(`http://${ip}/rpc/${method}?${paramStr}`, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await r.json();
      if (data.error) return { ok: false, error: data.error.message || JSON.stringify(data.error) };
      return { ok: true, data };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Nedostupné' };
    }
  }

  // Helper: call Shelly Gen2 Cloud RPC API
  async function shellyGen2CloudRequest(server: string, deviceId: string, method: string, params: Record<string, any>): Promise<{ ok: boolean; data?: any; error?: string }> {
    try {
      const authKey = process.env.SHELLY_CLOUD_AUTH_KEY || '';
      if (!authKey) return { ok: false, error: 'No auth key' };
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const body = new URLSearchParams({
        auth_key: authKey,
        id: deviceId,
        src: 'zaramia-admin',
        method,
        params: JSON.stringify(params),
      });
      const r = await fetch(`https://${server}/device/rpc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await r.json();
      if (!data.isok) return { ok: false, error: JSON.stringify(data.errors || data) };
      return { ok: true, data: data.data };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Nedostupné' };
    }
  }

  app.post("/api/admin/shelly/control", isAuthenticated, isAdmin, async (req, res) => {
    const { zone, action } = req.body;
    if (!zone || !['on', 'off'].includes(action)) {
      return res.status(400).json({ message: "Neplatné parametre" });
    }
    const settings = await storage.getShellySettings();
    const getSetting = (k: string) => settings.find((s: any) => s.key === k)?.value || '';
    const { ip, id: deviceId } = await getZoneConfig(zone, settings);
    const server = getSetting('shelly_server');
    const on = action === 'on';

    // Try Gen2 Cloud RPC first (if cloud connected)
    if (deviceId && server) {
      const result = await shellyGen2CloudRequest(server, deviceId, 'Switch.Set', { id: 0, on });
      if (result.ok) {
        console.log(`Shelly Cloud Gen2 Control: ${zone} (${deviceId}) → ${action}`);
        return res.json({ success: true, message: `Zóna "${zone}" bola ${on ? 'zapnutá' : 'vypnutá'} (Cloud)` });
      }
      console.warn(`Shelly Cloud Gen2 failed for ${zone}: ${result.error}`);
    }

    // Fallback: Gen2 local HTTP RPC
    if (!ip) {
      return res.status(400).json({ message: `Zariadenie "${zone}" nie je dostupné` });
    }
    const localResult = await shellyGen2Request(ip, 'Switch.Set', { id: 0, on });
    if (!localResult.ok) {
      return res.status(502).json({ message: `Shelly nedostupné: ${localResult.error}` });
    }
    console.log(`Shelly Local Gen2 Control: ${zone} (${ip}) → ${action}`);
    res.json({ success: true, message: `Zóna "${zone}" bola ${on ? 'zapnutá' : 'vypnutá'} (Lokálne)` });
  });

  app.get("/api/admin/shelly/status", isAuthenticated, isAdmin, async (req, res) => {
    const settings = await storage.getShellySettings();
    const zones = ['Svetlo hala', 'Hala2', 'Hala3', 'Bar bar'];
    const getSetting = (k: string) => settings.find((s: any) => s.key === k)?.value || '';
    const server = getSetting('shelly_server');

    const statuses = await Promise.all(zones.map(async (zone) => {
      const { ip, id: deviceId } = await getZoneConfig(zone, settings);

      // Try Gen2 Cloud first
      if (deviceId && server) {
        const result = await shellyGen2CloudRequest(server, deviceId, 'Switch.GetStatus', { id: 0 });
        if (result.ok) {
          const ison = result.data?.output;
          return { zone, deviceId, server, mode: 'cloud', status: ison ? 'on' : 'off', ip };
        }
      }

      // Fallback: Gen2 local HTTP RPC
      if (!ip) return { zone, status: 'unconfigured' };
      const result = await shellyGen2Request(ip, 'Switch.GetStatus', { id: 0 });
      if (!result.ok) return { zone, ip, mode: 'local', status: 'offline', error: result.error };
      return { zone, ip, deviceId, mode: 'local', status: result.data?.output ? 'on' : 'off' };
    }));
    res.json(statuses);
  });

  // Discover Shelly Cloud devices
  app.get("/api/admin/shelly/discover", isAuthenticated, isAdmin, async (req, res) => {
    const authKey = process.env.SHELLY_CLOUD_AUTH_KEY || '';
    if (!authKey) return res.status(400).json({ message: "SHELLY_CLOUD_AUTH_KEY nie je nastavený" });

    // Try api.shelly.cloud first, then EU servers
    const endpoints = [
      'https://api.shelly.cloud',
      'https://shelly-97-eu.shelly.cloud',
      'https://shelly-1-eu.shelly.cloud',
      'https://shelly-2-eu.shelly.cloud',
    ];

    for (const base of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const r = await fetch(`${base}/interface/device/list`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `auth_key=${encodeURIComponent(authKey)}&show_info=1`,
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const data = await r.json();
        if (data.isok && data.data?.devices) {
          const devices = Object.entries(data.data.devices).map(([id, info]: any) => ({
            id,
            name: info.name || info._name || id,
            type: info.type || info.code,
            online: info.online,
            server: base.replace('https://', ''),
          }));
          return res.json({ success: true, server: base.replace('https://', ''), devices });
        }
      } catch {}
    }
    res.json({ success: false, devices: [], message: "Žiadne zariadenia nenájdené. Skontroluj či máš zapnutú API integráciu v Shelly aplikácii: zariadenie → ⚙ → Integration → Allow access." });
  });

  // Shelly auto-check endpoint — called by Shelly Script every 60s
  // zone param: "Svetlo hala", "Hala2", "Hala3", "Bar bar"
  app.get("/api/shelly/check", async (req, res) => {
    const zone = (req.query.zone as string) || '';
    const isBar = zone.toLowerCase().includes('bar');
    const now = Date.now();

    // Hala zones: ON +1min → +65min after payment
    const HALA_ON  =  1 * 60 * 1000;
    const HALA_OFF = 65 * 60 * 1000;

    // Bar bar: ON 0→10min AND 60→75min after payment
    const BAR_GREET_START =  0 * 60 * 1000;
    const BAR_GREET_END   = 10 * 60 * 1000;
    const BAR_EXIT_START  = 60 * 60 * 1000;
    const BAR_EXIT_END    = 75 * 60 * 1000;

    try {
      const allBookings = await storage.getAllBookings();

      const activeBooking = allBookings.find(({ booking }: any) => {
        if (!booking || booking.status !== 'paid' || !booking.paidAt) return false;
        const t = new Date(booking.paidAt).getTime();
        const elapsed = now - t;
        if (isBar) {
          return (elapsed >= BAR_GREET_START && elapsed <= BAR_GREET_END) ||
                 (elapsed >= BAR_EXIT_START  && elapsed <= BAR_EXIT_END);
        }
        return elapsed >= HALA_ON && elapsed <= HALA_OFF;
      });

      if (activeBooking) {
        const { booking, facility } = activeBooking as any;
        const t = new Date(booking.paidAt).getTime();
        const elapsed = now - t;
        let reason = facility?.name || 'Rezervácia';
        if (isBar) {
          const phase = elapsed <= BAR_GREET_END ? 'príchod' : 'odchod';
          reason += ` — ${phase}`;
        } else {
          const offAt = new Date(t + HALA_OFF).toLocaleTimeString('sk-SK', { hour: '2-digit', minute: '2-digit' });
          reason += ` — svetlo do ${offAt}`;
        }
        return res.json({ on: true, reason });
      }

      res.json({ on: false, reason: 'Žiadna aktívna rezervácia' });
    } catch (err: any) {
      res.status(500).json({ on: false, reason: 'Chyba servera' });
    }
  });

  // Public schedule endpoint - shows bookings for a given date
  app.get("/api/schedule", async (req, res) => {
    const dateStr = req.query.date as string;
    const date = dateStr ? new Date(dateStr) : new Date();
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const allBookings = await storage.getAllBookings();
    const dayBookings = allBookings
      .filter(({ booking }: any) =>
        booking.status !== 'cancelled' &&
        new Date(booking.startTime) < dayEnd &&
        new Date(booking.endTime) > dayStart
      )
      .map(({ booking, facility }: any) => ({
        id: booking.id,
        facilityId: booking.facilityId,
        facilityName: facility?.name,
        sportType: facility?.sportType,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
      }));
    res.json(dayBookings);
  });

  seedDatabase().catch(console.error);
  syncFacilities().catch(console.error);

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
      description: "Moderná bowlingová dráha č. 1 v Zaramia Sport & Fun.",
      imageUrl: "/images/zaramia_bowling.jpg",
      pricePerHour: 1250,
      sportType: "bowling",
      courtNumber: "1",
      isComingSoon: false,
    });

    await storage.createFacility({
      name: "Bowling – Dráha 2",
      description: "Moderná bowlingová dráha č. 2 v Zaramia Sport & Fun.",
      imageUrl: "/images/zaramia_bowling.jpg",
      pricePerHour: 1250,
      sportType: "bowling",
      courtNumber: "2",
      isComingSoon: false,
    });

    // Table Tennis
    await storage.createFacility({
      name: "Stolný tenis – Stôl 1",
      description: "Kvalitný stôl na stolný tenis č. 1 v Zaramia Sport & Fun.",
      imageUrl: "/images/zaramia_pingpong.jpg",
      pricePerHour: 1000,
      sportType: "table_tennis",
      courtNumber: "1",
      isComingSoon: false,
    });

    // VR Zone
    await storage.createFacility({
      name: "VR Zóna – Meta Quest 3",
      description: "Vstúpte do sveta virtuálnej reality s najnovšími okuliarmi Meta Quest 3. K dispozícii máme 2 súpravy pre nezabudnuteľný zážitok.",
      imageUrl: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?auto=format&fit=crop&q=80&w=800",
      pricePerHour: 1000,
      sportType: "vr",
      courtNumber: "1",
      isComingSoon: false,
    });
  }
}

// Sync existing facilities to correct state (runs on every startup)
async function syncFacilities() {
  const updates: { id: number; isComingSoon: boolean; pricePerHour: number; description: string; imageUrl: string; name: string }[] = [
    { id: 1, isComingSoon: false, pricePerHour: 1250, name: "Badminton – Kurt 1", description: "Profesionálny bedmintonový kurt č. 1 v Zaramia Sport & Fun.", imageUrl: "/images/badminton.jpg" },
    { id: 2, isComingSoon: false, pricePerHour: 1250, name: "Badminton – Kurt 2", description: "Profesionálny bedmintonový kurt č. 2 v Zaramia Sport & Fun.", imageUrl: "/images/badminton.jpg" },
    { id: 3, isComingSoon: false, pricePerHour: 1250, name: "Badminton – Kurt 3", description: "Profesionálny bedmintonový kurt č. 3 v Zaramia Sport & Fun.", imageUrl: "/images/badminton.jpg" },
    { id: 4, isComingSoon: false, pricePerHour: 1250, name: "Bowling – Dráha 1", description: "Moderná bowlingová dráha č. 1 v Zaramia Sport & Fun.", imageUrl: "/images/bowling.jpg" },
    { id: 5, isComingSoon: false, pricePerHour: 1250, name: "Bowling – Dráha 2", description: "Moderná bowlingová dráha č. 2 v Zaramia Sport & Fun.", imageUrl: "/images/bowling.jpg" },
    { id: 6, isComingSoon: false, pricePerHour: 1000, name: "Stolný tenis – Stôl 1", description: "Kvalitný stôl na stolný tenis č. 1 v Zaramia Sport & Fun.", imageUrl: "/images/table-tennis-new.jpg" },
    { id: 7, isComingSoon: false, pricePerHour: 1000, name: "VR Zóna – Meta Quest 3", description: "Vstúpte do sveta virtuálnej reality s najnovšími okuliarmi Meta Quest 3. K dispozícii máme 2 súpravy pre nezabudnuteľný zážitok.", imageUrl: "https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?auto=format&fit=crop&q=80&w=800" },
  ];
  for (const u of updates) {
    await db.update(facilities)
      .set({ isComingSoon: u.isComingSoon, pricePerHour: u.pricePerHour, description: u.description, imageUrl: u.imageUrl, name: u.name })
      .where(eq(facilities.id, u.id));
  }
  console.log("Facilities synced.");
}
