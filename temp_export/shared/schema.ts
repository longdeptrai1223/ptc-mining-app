import { pgTable, text, serial, integer, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  firebaseUid: text("firebase_uid").notNull().unique(),
  username: text("username").notNull().unique(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  photoURL: text("photo_url"),
  inviteCode: text("invite_code").notNull().unique(),
  totalCoins: decimal("total_coins", { precision: 10, scale: 2 }).notNull().default("0"),
  miningRate: decimal("mining_rate", { precision: 10, scale: 2 }).notNull().default("0.1"),
  permanentBuffMultiplier: decimal("permanent_buff_multiplier", { precision: 10, scale: 2 }).notNull().default("1.0"),
  temporaryBuffMultiplier: decimal("temporary_buff_multiplier", { precision: 10, scale: 2 }).notNull().default("1.0"),
  temporaryBuffExpiry: timestamp("temporary_buff_expiry"),
  referralCount: integer("referral_count").notNull().default(0),
  lastActive: timestamp("last_active").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Mining sessions table
export const miningSessions = pgTable("mining_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").notNull().default("active"), // active, completed, cancelled
  multiplier: decimal("multiplier", { precision: 10, scale: 2 }).notNull().default("1.0"),
  amount: decimal("amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Referrals table
export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").references(() => users.id).notNull(),
  referredId: integer("referred_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  miningSessions: many(miningSessions),
  sentReferrals: many(referrals, { relationName: "referrer" }),
  receivedReferrals: many(referrals, { relationName: "referred" }),
  notifications: many(notifications),
}));

export const miningSessionsRelations = relations(miningSessions, ({ one }) => ({
  user: one(users, { fields: [miningSessions.userId], references: [users.id] }),
}));

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, { fields: [referrals.referrerId], references: [users.id] }),
  referred: one(users, { fields: [referrals.referredId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

// Schemas for validation
export const userInsertSchema = createInsertSchema(users);
export type UserInsert = z.infer<typeof userInsertSchema>;
export type User = typeof users.$inferSelect;

export const miningSessionInsertSchema = createInsertSchema(miningSessions);
export type MiningSessionInsert = z.infer<typeof miningSessionInsertSchema>;
export type MiningSession = typeof miningSessions.$inferSelect;

export const referralInsertSchema = createInsertSchema(referrals);
export type ReferralInsert = z.infer<typeof referralInsertSchema>;
export type Referral = typeof referrals.$inferSelect;

export const notificationInsertSchema = createInsertSchema(notifications);
export type NotificationInsert = z.infer<typeof notificationInsertSchema>;
export type Notification = typeof notifications.$inferSelect;
