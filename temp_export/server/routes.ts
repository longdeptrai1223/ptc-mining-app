import type { Express } from "express";
import { createServer, type Server } from "http";
import { db } from "@db";
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
import { eq, and, desc, gt, gte, lt } from "drizzle-orm";
import { z } from "zod";
import { nanoid } from "nanoid";

export async function registerRoutes(app: Express): Promise<Server> {
  // API prefix
  const apiPrefix = "/api";

  // Firebase Authentication Webhook
  app.post(`${apiPrefix}/auth/firebase-webhook`, async (req, res) => {
    try {
      const { uid, email, displayName, photoURL } = req.body;
      
      if (!uid || !email) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      // Check if user exists
      const existingUser = await db.query.users.findFirst({
        where: eq(users.firebaseUid, uid)
      });
      
      if (existingUser) {
        // Update last active
        await db.update(users)
          .set({ lastActive: new Date() })
          .where(eq(users.firebaseUid, uid));
          
        return res.status(200).json({ message: "User updated" });
      }
      
      // Create new user
      const inviteCode = nanoid(8).toUpperCase();
      const username = email.split('@')[0];
      
      const userData = {
        firebaseUid: uid,
        username,
        email,
        displayName: displayName || username,
        photoURL: photoURL || "",
        inviteCode,
        totalCoins: "0",
        miningRate: "0.1",
        permanentBuffMultiplier: "1.0",
        temporaryBuffMultiplier: "1.0",
        referralCount: 0
      };
      
      const validatedData = userInsertSchema.parse(userData);
      const [newUser] = await db.insert(users).values(validatedData).returning();
      
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error in firebase-webhook:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user data
  app.get(`${apiPrefix}/users/:uid`, async (req, res) => {
    try {
      const { uid } = req.params;
      
      const user = await db.query.users.findFirst({
        where: eq(users.firebaseUid, uid)
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(200).json(user);
    } catch (error) {
      console.error("Error getting user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update user data
  app.patch(`${apiPrefix}/users/:uid`, async (req, res) => {
    try {
      const { uid } = req.params;
      const updateData = req.body;
      
      // Find user
      const user = await db.query.users.findFirst({
        where: eq(users.firebaseUid, uid)
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user
      const [updatedUser] = await db.update(users)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning();
      
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Start mining session
  app.post(`${apiPrefix}/mining/start`, async (req, res) => {
    try {
      const { uid, duration } = req.body;
      
      if (!uid) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      // Get user
      const user = await db.query.users.findFirst({
        where: eq(users.firebaseUid, uid)
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if there's already an active mining session
      const activeSessions = await db.query.miningSessions.findMany({
        where: and(
          eq(miningSessions.userId, user.id),
          eq(miningSessions.status, "active")
        )
      });
      
      if (activeSessions.length > 0) {
        return res.status(409).json({ 
          message: "There is already an active mining session",
          session: activeSessions[0]
        });
      }
      
      // Calculate total multiplier
      const totalMultiplier = parseFloat(user.permanentBuffMultiplier) * parseFloat(user.temporaryBuffMultiplier);
      
      // Create mining session
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + (duration || 24 * 60 * 60 * 1000));
      
      const sessionData = {
        userId: user.id,
        startTime,
        endTime,
        status: "active",
        multiplier: totalMultiplier.toString(),
      };
      
      const validatedData = miningSessionInsertSchema.parse(sessionData);
      const [newSession] = await db.insert(miningSessions).values(validatedData).returning();
      
      res.status(201).json(newSession);
    } catch (error) {
      console.error("Error starting mining session:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Complete mining session
  app.post(`${apiPrefix}/mining/complete/:sessionId`, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { uid } = req.body;
      
      if (!uid) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      // Get user
      const user = await db.query.users.findFirst({
        where: eq(users.firebaseUid, uid)
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get mining session
      const session = await db.query.miningSessions.findFirst({
        where: and(
          eq(miningSessions.id, parseInt(sessionId)),
          eq(miningSessions.userId, user.id)
        )
      });
      
      if (!session) {
        return res.status(404).json({ message: "Mining session not found" });
      }
      
      if (session.status !== "active") {
        return res.status(409).json({ message: "Mining session is not active" });
      }
      
      // Calculate earnings
      const miningRate = parseFloat(user.miningRate);
      const multiplier = parseFloat(session.multiplier);
      const amount = miningRate * multiplier;
      
      // Update session
      const [updatedSession] = await db.update(miningSessions)
        .set({ 
          status: "completed", 
          amount: amount.toString(),
          updatedAt: new Date()
        })
        .where(eq(miningSessions.id, session.id))
        .returning();
      
      // Update user's total coins
      const newTotal = parseFloat(user.totalCoins) + amount;
      await db.update(users)
        .set({ 
          totalCoins: newTotal.toString(),
          lastActive: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));
      
      // Create notification
      const notificationData = {
        userId: user.id,
        title: "Mining Completed",
        message: `You earned ${amount.toFixed(2)} PTC from your mining session!`,
      };
      
      const validatedNotification = notificationInsertSchema.parse(notificationData);
      await db.insert(notifications).values(validatedNotification);
      
      res.status(200).json(updatedSession);
    } catch (error) {
      console.error("Error completing mining session:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Cancel mining session
  app.post(`${apiPrefix}/mining/cancel/:sessionId`, async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { uid } = req.body;
      
      if (!uid) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      // Get user
      const user = await db.query.users.findFirst({
        where: eq(users.firebaseUid, uid)
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get mining session
      const session = await db.query.miningSessions.findFirst({
        where: and(
          eq(miningSessions.id, parseInt(sessionId)),
          eq(miningSessions.userId, user.id)
        )
      });
      
      if (!session) {
        return res.status(404).json({ message: "Mining session not found" });
      }
      
      if (session.status !== "active") {
        return res.status(409).json({ message: "Mining session is not active" });
      }
      
      // Update session
      const [updatedSession] = await db.update(miningSessions)
        .set({ 
          status: "cancelled", 
          updatedAt: new Date()
        })
        .where(eq(miningSessions.id, session.id))
        .returning();
      
      res.status(200).json(updatedSession);
    } catch (error) {
      console.error("Error cancelling mining session:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get mining history
  app.get(`${apiPrefix}/mining/history/:uid`, async (req, res) => {
    try {
      const { uid } = req.params;
      const { limit = "10" } = req.query;
      
      const user = await db.query.users.findFirst({
        where: eq(users.firebaseUid, uid)
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const history = await db.query.miningSessions.findMany({
        where: and(
          eq(miningSessions.userId, user.id),
          eq(miningSessions.status, "completed"),
          lt(miningSessions.endTime, new Date())
        ),
        orderBy: [desc(miningSessions.endTime)],
        limit: parseInt(limit as string)
      });
      
      res.status(200).json(history);
    } catch (error) {
      console.error("Error getting mining history:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Activate ad buff
  app.post(`${apiPrefix}/mining/ad-buff`, async (req, res) => {
    try {
      const { uid, duration } = req.body;
      
      if (!uid) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const user = await db.query.users.findFirst({
        where: eq(users.firebaseUid, uid)
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Calculate new expiry time (add 2 hours or extend current time)
      const now = new Date();
      const buffDuration = duration || 2 * 60 * 60 * 1000; // 2 hours in ms
      
      let newExpiry;
      if (user.temporaryBuffExpiry && user.temporaryBuffExpiry > now) {
        // Extend existing buff
        const maxExpiry = new Date(now.getTime() + (24 * 60 * 60 * 1000));
        const extendedExpiry = new Date(user.temporaryBuffExpiry.getTime() + buffDuration);
        
        newExpiry = extendedExpiry < maxExpiry ? extendedExpiry : maxExpiry;
      } else {
        // New buff
        newExpiry = new Date(now.getTime() + buffDuration);
      }
      
      // Update user
      const [updatedUser] = await db.update(users)
        .set({ 
          temporaryBuffMultiplier: "5.0",
          temporaryBuffExpiry: newExpiry,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id))
        .returning();
      
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("Error activating ad buff:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Process referral
  app.post(`${apiPrefix}/referrals/redeem`, async (req, res) => {
    try {
      const { uid, referralCode } = req.body;
      
      if (!uid || !referralCode) {
        return res.status(400).json({ message: "User ID and referral code are required" });
      }
      
      // Get user
      const user = await db.query.users.findFirst({
        where: eq(users.firebaseUid, uid)
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get referrer
      const referrer = await db.query.users.findFirst({
        where: eq(users.inviteCode, referralCode)
      });
      
      if (!referrer) {
        return res.status(404).json({ message: "Invalid referral code" });
      }
      
      // Check if user is trying to refer themselves
      if (referrer.id === user.id) {
        return res.status(409).json({ message: "You cannot refer yourself" });
      }
      
      // Check if referral already exists
      const existingReferral = await db.query.referrals.findFirst({
        where: and(
          eq(referrals.referrerId, referrer.id),
          eq(referrals.referredId, user.id)
        )
      });
      
      if (existingReferral) {
        return res.status(409).json({ message: "Referral already exists" });
      }
      
      // Create referral
      const referralData = {
        referrerId: referrer.id,
        referredId: user.id
      };
      
      const validatedReferral = referralInsertSchema.parse(referralData);
      await db.insert(referrals).values(validatedReferral);
      
      // Update referrer's referral count and buff
      const newReferralCount = referrer.referralCount + 1;
      const newBuffMultiplier = Math.min(2.0, 1.0 + (newReferralCount * 0.1));
      
      await db.update(users)
        .set({ 
          referralCount: newReferralCount,
          permanentBuffMultiplier: newBuffMultiplier.toString(),
          updatedAt: new Date()
        })
        .where(eq(users.id, referrer.id));
      
      // Create notification for referrer
      const notificationData = {
        userId: referrer.id,
        title: "New Referral",
        message: `${user.displayName} joined using your referral code! Your mining multiplier is now ${newBuffMultiplier.toFixed(1)}x.`
      };
      
      const validatedNotification = notificationInsertSchema.parse(notificationData);
      await db.insert(notifications).values(validatedNotification);
      
      res.status(201).json({ message: "Referral processed successfully" });
    } catch (error) {
      console.error("Error processing referral:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user's referrals
  app.get(`${apiPrefix}/referrals/:uid`, async (req, res) => {
    try {
      const { uid } = req.params;
      
      const user = await db.query.users.findFirst({
        where: eq(users.firebaseUid, uid)
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const userReferrals = await db.query.referrals.findMany({
        where: eq(referrals.referrerId, user.id),
        orderBy: [desc(referrals.createdAt)],
        with: {
          referred: true
        }
      });
      
      // Format response
      const formattedReferrals = userReferrals.map(ref => {
        const referredUser = ref.referred;
        const isActive = referredUser.lastActive 
          ? (new Date().getTime() - new Date(referredUser.lastActive).getTime()) < 7 * 24 * 60 * 60 * 1000 
          : false;
          
        return {
          id: ref.id,
          displayName: referredUser.displayName,
          photoURL: referredUser.photoURL,
          joinedAt: ref.createdAt,
          isActive
        };
      });
      
      res.status(200).json(formattedReferrals);
    } catch (error) {
      console.error("Error getting referrals:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get notifications
  app.get(`${apiPrefix}/notifications/:uid`, async (req, res) => {
    try {
      const { uid } = req.params;
      
      const user = await db.query.users.findFirst({
        where: eq(users.firebaseUid, uid)
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const userNotifications = await db.query.notifications.findMany({
        where: eq(notifications.userId, user.id),
        orderBy: [desc(notifications.createdAt)]
      });
      
      res.status(200).json(userNotifications);
    } catch (error) {
      console.error("Error getting notifications:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mark notification as read
  app.patch(`${apiPrefix}/notifications/:id/read`, async (req, res) => {
    try {
      const { id } = req.params;
      const { uid } = req.body;
      
      if (!uid) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      const user = await db.query.users.findFirst({
        where: eq(users.firebaseUid, uid)
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update notification
      const [updatedNotification] = await db.update(notifications)
        .set({ read: true })
        .where(and(
          eq(notifications.id, parseInt(id)),
          eq(notifications.userId, user.id)
        ))
        .returning();
      
      if (!updatedNotification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      res.status(200).json(updatedNotification);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Sync data endpoint for background sync
  app.post(`${apiPrefix}/sync`, async (req, res) => {
    try {
      const { uid, data } = req.body;
      
      if (!uid || !data) {
        return res.status(400).json({ message: "User ID and data are required" });
      }
      
      const user = await db.query.users.findFirst({
        where: eq(users.firebaseUid, uid)
      });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Process mining data
      if (data.miningStartTime && data.miningEndTime) {
        // Check if there's an active mining session
        const activeSession = await db.query.miningSessions.findFirst({
          where: and(
            eq(miningSessions.userId, user.id),
            eq(miningSessions.status, "active")
          )
        });
        
        if (!activeSession) {
          // Create a new mining session
          const sessionData = {
            userId: user.id,
            startTime: new Date(data.miningStartTime),
            endTime: new Date(data.miningEndTime),
            status: "active",
            multiplier: (parseFloat(user.permanentBuffMultiplier) * 
              parseFloat(user.temporaryBuffMultiplier)).toString()
          };
          
          const validatedSession = miningSessionInsertSchema.parse(sessionData);
          await db.insert(miningSessions).values(validatedSession);
        }
      }
      
      // Sync total coins if needed
      if (data.totalCoins && parseFloat(data.totalCoins) > parseFloat(user.totalCoins)) {
        await db.update(users)
          .set({ 
            totalCoins: data.totalCoins.toString(),
            lastActive: new Date(),
            updatedAt: new Date()
          })
          .where(eq(users.id, user.id));
      }
      
      // Sync ad buff if needed
      if (data.adBuffExpiry) {
        const adBuffExpiry = new Date(data.adBuffExpiry);
        
        if (!user.temporaryBuffExpiry || adBuffExpiry > user.temporaryBuffExpiry) {
          await db.update(users)
            .set({ 
              temporaryBuffMultiplier: "5.0",
              temporaryBuffExpiry: adBuffExpiry,
              updatedAt: new Date()
            })
            .where(eq(users.id, user.id));
        }
      }
      
      res.status(200).json({ message: "Data synced successfully" });
    } catch (error) {
      console.error("Error syncing data:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
