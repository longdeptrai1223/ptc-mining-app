import { db } from "./index";
import { 
  users, 
  miningSessions, 
  referrals, 
  notifications,
  userInsertSchema,
  miningSessionInsertSchema,
  referralInsertSchema,
  notificationInsertSchema
} from "@shared/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

async function seed() {
  try {
    console.log("Starting seed process...");

    // Check if there are already users in the database
    const existingUsers = await db.query.users.findMany({
      limit: 1
    });
    
    if (existingUsers.length > 0) {
      console.log("Database already contains users, skipping seed.");
      return;
    }

    console.log("Creating demo users...");
    
    // Create demo users
    const demoUsers = [
      {
        firebaseUid: "demo1",
        username: "alexsmith",
        email: "alex@example.com",
        displayName: "Alex Smith",
        photoURL: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
        inviteCode: nanoid(8).toUpperCase(),
        totalCoins: "28.7",
        miningRate: "0.1",
        permanentBuffMultiplier: "1.5",
        temporaryBuffMultiplier: "5.0",
        temporaryBuffExpiry: new Date(Date.now() + 5.5 * 60 * 60 * 1000),
        referralCount: 15,
        lastActive: new Date()
      },
      {
        firebaseUid: "demo2",
        username: "sarahm",
        email: "sarah@example.com",
        displayName: "Sarah Miller",
        photoURL: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
        inviteCode: nanoid(8).toUpperCase(),
        totalCoins: "15.2",
        miningRate: "0.1",
        permanentBuffMultiplier: "1.2",
        temporaryBuffMultiplier: "1.0",
        referralCount: 2,
        lastActive: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        firebaseUid: "demo3",
        username: "mikejones",
        email: "mike@example.com",
        displayName: "Mike Jones",
        photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?ixlib=rb-4.0.3&auto=format&fit=crop&w=100&h=100",
        inviteCode: nanoid(8).toUpperCase(),
        totalCoins: "5.8",
        miningRate: "0.1",
        permanentBuffMultiplier: "1.0",
        temporaryBuffMultiplier: "1.0",
        referralCount: 0,
        lastActive: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      }
    ];
    
    // Insert users
    const insertedUsers = [];
    for (const userData of demoUsers) {
      const validatedUser = userInsertSchema.parse(userData);
      const [user] = await db.insert(users).values(validatedUser).returning();
      insertedUsers.push(user);
    }
    
    console.log(`Created ${insertedUsers.length} demo users.`);
    
    // Create mining sessions
    console.log("Creating mining sessions...");
    
    const mainUser = insertedUsers[0];
    
    // Active mining session
    const activeSession = {
      userId: mainUser.id,
      startTime: new Date(Date.now() - 18.5 * 60 * 60 * 1000),
      endTime: new Date(Date.now() + 5.5 * 60 * 60 * 1000),
      status: "active",
      multiplier: "7.5"
    };
    
    const validatedActiveSession = miningSessionInsertSchema.parse(activeSession);
    await db.insert(miningSessions).values(validatedActiveSession);
    
    // Completed mining sessions
    const completedSessions = [
      {
        userId: mainUser.id,
        startTime: new Date(Date.now() - 48 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        status: "completed",
        multiplier: "7.5",
        amount: "0.75"
      },
      {
        userId: mainUser.id,
        startTime: new Date(Date.now() - 72 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 48 * 60 * 60 * 1000),
        status: "completed",
        multiplier: "7.5",
        amount: "0.75"
      },
      {
        userId: mainUser.id,
        startTime: new Date(Date.now() - 96 * 60 * 60 * 1000),
        endTime: new Date(Date.now() - 72 * 60 * 60 * 1000),
        status: "completed",
        multiplier: "2.0",
        amount: "0.20"
      }
    ];
    
    for (const sessionData of completedSessions) {
      const validatedSession = miningSessionInsertSchema.parse(sessionData);
      await db.insert(miningSessions).values(validatedSession);
    }
    
    console.log(`Created ${completedSessions.length + 1} mining sessions.`);
    
    // Create referrals
    console.log("Creating referrals...");
    
    // User 1 referred user 2 and 3
    const referralEntries = [
      {
        referrerId: mainUser.id,
        referredId: insertedUsers[1].id
      },
      {
        referrerId: mainUser.id,
        referredId: insertedUsers[2].id
      }
    ];
    
    for (const referralData of referralEntries) {
      const validatedReferral = referralInsertSchema.parse(referralData);
      await db.insert(referrals).values(validatedReferral);
    }
    
    console.log(`Created ${referralEntries.length} referrals.`);
    
    // Create notifications
    console.log("Creating notifications...");
    
    const notificationEntries = [
      {
        userId: mainUser.id,
        title: "Mining Completed",
        message: "You earned 0.75 PTC from your mining session!",
        read: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        userId: mainUser.id,
        title: "New Referral",
        message: "Sarah Miller joined using your referral code! Your mining multiplier is now 1.1x.",
        read: false,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        userId: mainUser.id,
        title: "Mining Buff Activated",
        message: "5x mining boost activated for 2 hours!",
        read: true,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000)
      }
    ];
    
    for (const notificationData of notificationEntries) {
      const validatedNotification = notificationInsertSchema.parse(notificationData);
      await db.insert(notifications).values(validatedNotification);
    }
    
    console.log(`Created ${notificationEntries.length} notifications.`);
    console.log("Seed completed successfully!");
  } catch (error) {
    console.error("Error during seed:", error);
  }
}

seed();
