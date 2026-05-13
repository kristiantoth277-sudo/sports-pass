import { facilities, bookings, users, shellySettings } from "@shared/schema";
import type { InsertFacility, InsertBooking, Facility, Booking } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Facilities
  getFacilities(): Promise<Facility[]>;
  getFacility(id: number): Promise<Facility | undefined>;
  createFacility(facility: InsertFacility): Promise<Facility>;

  // Bookings
  getBookingsByUserId(userId: string): Promise<any[]>; // returns bookings with facility info
  getBooking(id: number): Promise<any | undefined>;
  createBooking(booking: InsertBooking & { userId: string }): Promise<Booking>;
  updateBookingStatus(id: number, status: string, qrCodeData?: string): Promise<Booking | undefined>;
  updateBookingPaymentId(id: number, besteronPaymentId: string): Promise<Booking | undefined>;
  getAllBookings(): Promise<any[]>;
  getShellySettings(): Promise<any[]>;
  updateShellySetting(key: string, value: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getFacilities(): Promise<Facility[]> {
    return await db.select().from(facilities);
  }

  async getFacility(id: number): Promise<Facility | undefined> {
    const [facility] = await db.select().from(facilities).where(eq(facilities.id, id));
    return facility;
  }

  async createFacility(facility: InsertFacility): Promise<Facility> {
    const [newFacility] = await db.insert(facilities).values(facility).returning();
    return newFacility;
  }

  async getBookingsByUserId(userId: string): Promise<any[]> {
    return await db
      .select({
        booking: bookings,
        facility: facilities,
      })
      .from(bookings)
      .leftJoin(facilities, eq(bookings.facilityId, facilities.id))
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.startTime));
  }

  async getBooking(id: number): Promise<any | undefined> {
    const [result] = await db
      .select({
        booking: bookings,
        facility: facilities,
      })
      .from(bookings)
      .leftJoin(facilities, eq(bookings.facilityId, facilities.id))
      .where(eq(bookings.id, id));
    
    return result;
  }

  async createBooking(booking: InsertBooking & { userId: string }): Promise<Booking> {
    const [newBooking] = await db
      .insert(bookings)
      .values({
        ...booking,
        status: "pending",
        startTime: new Date(booking.startTime),
        endTime: new Date(booking.endTime),
      })
      .returning();
    return newBooking;
  }

  async updateBookingStatus(id: number, status: string, qrCodeData?: string): Promise<Booking | undefined> {
    const [updatedBooking] = await db
      .update(bookings)
      .set({ 
        status, 
        ...(qrCodeData && { qrCodeData }),
        ...(status === 'paid' && { paidAt: new Date() }),
      })
      .where(eq(bookings.id, id))
      .returning();
    return updatedBooking;
  }

  async updateBookingPaymentId(id: number, besteronPaymentId: string): Promise<Booking | undefined> {
    const [updatedBooking] = await db
      .update(bookings)
      .set({ besteronPaymentId })
      .where(eq(bookings.id, id))
      .returning();
    return updatedBooking;
  }

  async getAllBookings(): Promise<any[]> {
    return await db
      .select({
        booking: bookings,
        facility: facilities,
        user: users,
      })
      .from(bookings)
      .leftJoin(facilities, eq(bookings.facilityId, facilities.id))
      .leftJoin(users, eq(bookings.userId, users.id))
      .orderBy(desc(bookings.startTime));
  }

  async getShellySettings(): Promise<any[]> {
    return await db.select().from(shellySettings);
  }

  async updateShellySetting(key: string, value: string): Promise<void> {
    await db
      .insert(shellySettings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: shellySettings.key,
        set: { value },
      });
  }
}

export const storage = new DatabaseStorage();
