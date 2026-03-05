import { pgTable, text, varchar, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./models/auth";

export * from "./models/auth";

export const facilities = pgTable("facilities", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  pricePerHour: integer("price_per_hour").notNull(), // in cents
  sportType: text("sport_type").notNull(), // e.g., 'badminton', 'bowling', 'table_tennis', 'pizza', 'bar'
  courtNumber: text("court_number"), // e.g., 'Kurt 1', 'Kurt 2'
  isComingSoon: boolean("is_coming_soon").default(false),
});

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  facilityId: integer("facility_id").notNull().references(() => facilities.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").notNull().default("reserved"), // 'reserved', 'paid', 'cancelled'
  qrCodeData: text("qr_code_data"),
  totalPrice: integer("total_price").notNull(), // in cents
  besteronPaymentId: text("besteron_payment_id"), // Besteron paymentIntentId
});

export const shellySettings = pgTable("shelly_settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // e.g., 'court1_lights_ip'
  value: text("value").notNull(),
});

export const facilitiesRelations = relations(facilities, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  user: one(users, {
    fields: [bookings.userId],
    references: [users.id],
  }),
  facility: one(facilities, {
    fields: [bookings.facilityId],
    references: [facilities.id],
  }),
}));

export const insertFacilitySchema = createInsertSchema(facilities).omit({ id: true });
export const insertBookingSchema = createInsertSchema(bookings).omit({ 
  id: true, 
  status: true, 
  qrCodeData: true,
  userId: true 
});

export type Facility = typeof facilities.$inferSelect;
export type InsertFacility = z.infer<typeof insertFacilitySchema>;

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

export type CreateBookingRequest = InsertBooking;
