var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  blockchainRecords: () => blockchainRecords,
  blockchainRecordsRelations: () => blockchainRecordsRelations,
  escalationHistory: () => escalationHistory,
  escalationHistoryRelations: () => escalationHistoryRelations,
  grievances: () => grievances,
  grievancesRelations: () => grievancesRelations,
  insertBlockchainRecordSchema: () => insertBlockchainRecordSchema,
  insertEscalationHistorySchema: () => insertEscalationHistorySchema,
  insertGrievanceSchema: () => insertGrievanceSchema,
  insertUserSchema: () => insertUserSchema,
  insertVerificationSchema: () => insertVerificationSchema,
  users: () => users,
  usersRelations: () => usersRelations,
  verifications: () => verifications,
  verificationsRelations: () => verificationsRelations
});
import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("citizen"),
  mobileNumber: text("mobile_number").notNull(),
  email: text("email"),
  villageName: text("village_name"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var grievances = pgTable("grievances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  grievanceNumber: text("grievance_number").notNull().unique(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  title: text("title").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  villageName: text("village_name").notNull(),
  status: text("status").notNull().default("pending"),
  priority: text("priority").notNull().default("medium"),
  evidenceFiles: text("evidence_files").array(),
  voiceRecordingUrl: text("voice_recording_url"),
  voiceTranscription: text("voice_transcription"),
  assignedTo: varchar("assigned_to").references(() => users.id),
  resolutionTimeline: integer("resolution_timeline"),
  dueDate: timestamp("due_date"),
  resolvedAt: timestamp("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  resolutionEvidence: text("resolution_evidence").array(),
  verificationDeadline: timestamp("verification_deadline"),
  isEscalated: boolean("is_escalated").default(false),
  escalatedAt: timestamp("escalated_at"),
  currentAuthorityLevel: text("current_authority_level").notNull().default("panchayat"),
  escalationCount: integer("escalation_count").notNull().default(0),
  escalationReason: text("escalation_reason"),
  escalationDueDate: timestamp("escalation_due_date"),
  canResolve: boolean("can_resolve"),
  userSatisfaction: text("user_satisfaction"),
  userSatisfactionAt: timestamp("user_satisfaction_at"),
  communityVerifyCount: integer("community_verify_count").notNull().default(0),
  communityDisputeCount: integer("community_dispute_count").notNull().default(0),
  autoCloseAt: timestamp("auto_close_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var verifications = pgTable("verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  grievanceId: varchar("grievance_id").references(() => grievances.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  verificationType: text("verification_type").notNull(),
  status: text("status").notNull(),
  comments: text("comments"),
  evidenceFiles: text("evidence_files").array(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var blockchainRecords = pgTable("blockchain_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  grievanceId: varchar("grievance_id").references(() => grievances.id).notNull(),
  transactionHash: text("transaction_hash").notNull().unique(),
  blockNumber: text("block_number"),
  eventType: text("event_type").notNull(),
  eventData: text("event_data").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull()
});
var escalationHistory = pgTable("escalation_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  grievanceId: varchar("grievance_id").references(() => grievances.id).notNull(),
  fromLevel: text("from_level").notNull(),
  toLevel: text("to_level").notNull(),
  reason: text("reason").notNull(),
  escalatedBy: varchar("escalated_by").references(() => users.id),
  autoEscalated: boolean("auto_escalated").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var usersRelations = relations(users, ({ many }) => ({
  grievances: many(grievances),
  verifications: many(verifications)
}));
var grievancesRelations = relations(grievances, ({ one, many }) => ({
  user: one(users, {
    fields: [grievances.userId],
    references: [users.id]
  }),
  assignedOfficer: one(users, {
    fields: [grievances.assignedTo],
    references: [users.id]
  }),
  verifications: many(verifications),
  blockchainRecords: many(blockchainRecords),
  escalationHistory: many(escalationHistory)
}));
var verificationsRelations = relations(verifications, ({ one }) => ({
  grievance: one(grievances, {
    fields: [verifications.grievanceId],
    references: [grievances.id]
  }),
  user: one(users, {
    fields: [verifications.userId],
    references: [users.id]
  })
}));
var blockchainRecordsRelations = relations(blockchainRecords, ({ one }) => ({
  grievance: one(grievances, {
    fields: [blockchainRecords.grievanceId],
    references: [grievances.id]
  })
}));
var escalationHistoryRelations = relations(escalationHistory, ({ one }) => ({
  grievance: one(grievances, {
    fields: [escalationHistory.grievanceId],
    references: [grievances.id]
  }),
  escalatedByUser: one(users, {
    fields: [escalationHistory.escalatedBy],
    references: [users.id]
  })
}));
var insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true
});
var insertGrievanceSchema = createInsertSchema(grievances).omit({
  id: true,
  grievanceNumber: true,
  status: true,
  isEscalated: true,
  escalatedAt: true,
  createdAt: true,
  updatedAt: true,
  userId: true,
  assignedTo: true,
  resolvedAt: true,
  verificationDeadline: true,
  currentAuthorityLevel: true,
  escalationCount: true,
  escalationReason: true,
  escalationDueDate: true,
  canResolve: true,
  userSatisfaction: true,
  userSatisfactionAt: true,
  communityVerifyCount: true,
  communityDisputeCount: true,
  autoCloseAt: true
}).extend({
  title: z.string().min(10, "Title must be at least 10 characters"),
  description: z.string().min(50, "Description must be at least 50 characters"),
  category: z.enum([
    "Water Supply",
    "Road & Infrastructure",
    "Electricity",
    "Sanitation & Waste Management",
    "Healthcare",
    "Education",
    "Agriculture Support",
    "Social Welfare Schemes",
    "Other"
  ])
});
var insertVerificationSchema = createInsertSchema(verifications).omit({
  id: true,
  createdAt: true,
  userId: true
}).extend({
  verificationType: z.enum(["verify", "dispute"]),
  status: z.enum(["verified", "disputed"])
});
var insertBlockchainRecordSchema = createInsertSchema(blockchainRecords).omit({
  id: true,
  timestamp: true
});
var insertEscalationHistorySchema = createInsertSchema(escalationHistory).omit({
  id: true,
  createdAt: true
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, and, desc, or, lt, gt } from "drizzle-orm";
var DatabaseStorage = class {
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || void 0;
  }
  async getUserByUsername(username) {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || void 0;
  }
  async createUser(insertUser) {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }
  async getAllGrievances() {
    return await db.select().from(grievances).orderBy(desc(grievances.createdAt));
  }
  async getGrievance(id) {
    const [grievance] = await db.select().from(grievances).where(eq(grievances.id, id));
    return grievance || void 0;
  }
  async getGrievancesByUser(userId) {
    return await db.select().from(grievances).where(eq(grievances.userId, userId)).orderBy(desc(grievances.createdAt));
  }
  async getAssignedGrievances(officerId) {
    return await db.select().from(grievances).where(eq(grievances.assignedTo, officerId)).orderBy(desc(grievances.createdAt));
  }
  async createGrievance(grievance, userId, fullName, mobileNumber) {
    let user = await this.getUserByUsername(mobileNumber);
    if (!user) {
      user = await this.createUser({
        username: mobileNumber,
        password: "temp",
        fullName,
        mobileNumber,
        email: null,
        villageName: grievance.villageName,
        role: "citizen"
      });
    }
    const grievanceNumber = `GR${(/* @__PURE__ */ new Date()).getFullYear()}${String(Math.floor(Math.random() * 1e5)).padStart(5, "0")}`;
    const [newGrievance] = await db.insert(grievances).values({
      ...grievance,
      userId: user.id,
      grievanceNumber,
      status: "pending",
      priority: "medium"
    }).returning();
    const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
    await this.createBlockchainRecord({
      grievanceId: newGrievance.id,
      transactionHash,
      blockNumber: String(Math.floor(Math.random() * 1e6)),
      eventType: "GRIEVANCE_SUBMITTED",
      eventData: JSON.stringify({
        grievanceNumber: newGrievance.grievanceNumber,
        category: newGrievance.category,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      })
    });
    return newGrievance;
  }
  async updateGrievanceStatus(id, status, updates) {
    const [updated] = await db.update(grievances).set({
      status,
      updatedAt: /* @__PURE__ */ new Date(),
      ...updates
    }).where(eq(grievances.id, id)).returning();
    if (updated) {
      const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      await this.createBlockchainRecord({
        grievanceId: updated.id,
        transactionHash,
        blockNumber: String(Math.floor(Math.random() * 1e6)),
        eventType: "STATUS_UPDATED",
        eventData: JSON.stringify({
          grievanceNumber: updated.grievanceNumber,
          newStatus: status,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        })
      });
    }
    return updated || void 0;
  }
  async acceptGrievance(id, officerId, resolutionTimeline) {
    const dueDate = /* @__PURE__ */ new Date();
    dueDate.setDate(dueDate.getDate() + resolutionTimeline);
    const [updated] = await db.update(grievances).set({
      status: "in_progress",
      assignedTo: officerId,
      resolutionTimeline,
      dueDate,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(grievances.id, id)).returning();
    if (updated) {
      const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      await this.createBlockchainRecord({
        grievanceId: updated.id,
        transactionHash,
        blockNumber: String(Math.floor(Math.random() * 1e6)),
        eventType: "TASK_ACCEPTED",
        eventData: JSON.stringify({
          grievanceNumber: updated.grievanceNumber,
          officerId,
          resolutionTimeline,
          dueDate: dueDate.toISOString(),
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        })
      });
    }
    return updated || void 0;
  }
  async createVerification(verification, userId) {
    const [newVerification] = await db.insert(verifications).values({
      ...verification,
      userId
    }).returning();
    const grievance = await this.getGrievance(verification.grievanceId);
    if (grievance) {
      const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      await this.createBlockchainRecord({
        grievanceId: grievance.id,
        transactionHash,
        blockNumber: String(Math.floor(Math.random() * 1e6)),
        eventType: "COMMUNITY_VERIFICATION",
        eventData: JSON.stringify({
          grievanceNumber: grievance.grievanceNumber,
          verificationType: verification.verificationType,
          status: verification.status,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        })
      });
    }
    return newVerification;
  }
  async getVerificationsByGrievance(grievanceId) {
    return await db.select().from(verifications).where(eq(verifications.grievanceId, grievanceId)).orderBy(desc(verifications.createdAt));
  }
  async createBlockchainRecord(record) {
    const [newRecord] = await db.insert(blockchainRecords).values(record).returning();
    return newRecord;
  }
  async getBlockchainRecordsByGrievance(grievanceId) {
    return await db.select().from(blockchainRecords).where(eq(blockchainRecords.grievanceId, grievanceId)).orderBy(desc(blockchainRecords.timestamp));
  }
  // Community Verification & User Satisfaction
  async submitUserSatisfaction(grievanceId, satisfaction) {
    const [updated] = await db.update(grievances).set({
      userSatisfaction: satisfaction,
      userSatisfactionAt: /* @__PURE__ */ new Date(),
      status: satisfaction === "satisfied" ? "resolved" : "in_progress",
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(grievances.id, grievanceId)).returning();
    if (updated) {
      const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      await this.createBlockchainRecord({
        grievanceId: updated.id,
        transactionHash,
        blockNumber: String(Math.floor(Math.random() * 1e6)),
        eventType: "USER_SATISFACTION",
        eventData: JSON.stringify({
          grievanceNumber: updated.grievanceNumber,
          satisfaction,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        })
      });
    }
    return updated || void 0;
  }
  async submitCommunityVote(grievanceId, voteType, userId, comments) {
    const grievance = await this.getGrievance(grievanceId);
    if (!grievance) return void 0;
    if (grievance.userSatisfaction) {
      return grievance;
    }
    const verifyCount = voteType === "verify" ? grievance.communityVerifyCount + 1 : grievance.communityVerifyCount;
    const disputeCount = voteType === "dispute" ? grievance.communityDisputeCount + 1 : grievance.communityDisputeCount;
    let newStatus = grievance.status;
    if (voteType === "dispute") {
      newStatus = "in_progress";
    } else if (verifyCount >= 3) {
      newStatus = "resolved";
    }
    const [updated] = await db.update(grievances).set({
      communityVerifyCount: verifyCount,
      communityDisputeCount: disputeCount,
      status: newStatus,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(grievances.id, grievanceId)).returning();
    await this.createVerification(
      {
        grievanceId,
        verificationType: voteType,
        status: voteType === "verify" ? "verified" : "disputed",
        comments: comments || null,
        evidenceFiles: []
      },
      userId
    );
    return updated || void 0;
  }
  async getPendingVerificationGrievances() {
    return await db.select().from(grievances).where(eq(grievances.status, "pending_verification")).orderBy(desc(grievances.resolvedAt));
  }
  // Escalation Management
  async escalateGrievance(grievanceId, reason, officerId) {
    const grievance = await this.getGrievance(grievanceId);
    if (!grievance) return void 0;
    const authorityLevels = ["panchayat", "block", "district", "state"];
    const currentIndex = authorityLevels.indexOf(grievance.currentAuthorityLevel);
    const nextLevel = authorityLevels[Math.min(currentIndex + 1, authorityLevels.length - 1)];
    const escalationDueDate = /* @__PURE__ */ new Date();
    escalationDueDate.setDate(escalationDueDate.getDate() + 10);
    const [updated] = await db.update(grievances).set({
      currentAuthorityLevel: nextLevel,
      escalationCount: grievance.escalationCount + 1,
      escalationReason: reason,
      escalationDueDate,
      isEscalated: true,
      escalatedAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(grievances.id, grievanceId)).returning();
    if (updated) {
      await this.createEscalationHistory({
        grievanceId,
        fromLevel: grievance.currentAuthorityLevel,
        toLevel: nextLevel,
        reason,
        escalatedBy: officerId || null,
        autoEscalated: !officerId
      });
      const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      await this.createBlockchainRecord({
        grievanceId: updated.id,
        transactionHash,
        blockNumber: String(Math.floor(Math.random() * 1e6)),
        eventType: "GRIEVANCE_ESCALATED",
        eventData: JSON.stringify({
          grievanceNumber: updated.grievanceNumber,
          fromLevel: grievance.currentAuthorityLevel,
          toLevel: nextLevel,
          reason,
          autoEscalated: !officerId,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        })
      });
    }
    return updated || void 0;
  }
  async createEscalationHistory(history) {
    const [newHistory] = await db.insert(escalationHistory).values(history).returning();
    return newHistory;
  }
  async getEscalationHistory(grievanceId) {
    return await db.select().from(escalationHistory).where(eq(escalationHistory.grievanceId, grievanceId)).orderBy(desc(escalationHistory.createdAt));
  }
  async cannotResolve(grievanceId, reason, officerId) {
    const [updated] = await db.update(grievances).set({
      canResolve: false,
      escalationReason: reason,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(grievances.id, grievanceId)).returning();
    if (updated) {
      await this.escalateGrievance(grievanceId, reason, officerId);
    }
    return updated || void 0;
  }
  // Admin Panel
  async getDisputedGrievances() {
    return await db.select().from(grievances).where(or(
      eq(grievances.userSatisfaction, "not_satisfied"),
      gt(grievances.communityDisputeCount, 0)
    )).orderBy(desc(grievances.updatedAt));
  }
  async getOverdueGrievances() {
    const now = /* @__PURE__ */ new Date();
    return await db.select().from(grievances).where(
      and(
        lt(grievances.dueDate, now),
        or(
          eq(grievances.status, "pending"),
          eq(grievances.status, "in_progress")
        )
      )
    ).orderBy(desc(grievances.dueDate));
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq as eq2 } from "drizzle-orm";
import { z as z2 } from "zod";

// server/blockchain.ts
import Web3 from "web3";
var GrievanceSystemABI = {
  abi: []
  // This will be populated after contract compilation
};
var BlockchainService = class {
  web3;
  contract;
  constructor() {
    const providerUrl = process.env.ETHEREUM_NODE_URL || "http://localhost:8545";
    this.web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));
    const contractAddress = process.env.GRIEVANCE_CONTRACT_ADDRESS;
    if (contractAddress) {
      this.contract = new this.web3.eth.Contract(
        GrievanceSystemABI.abi,
        contractAddress
      );
    }
  }
  async submitGrievance(grievanceHash, fromAddress) {
    if (!this.contract) {
      console.warn("Contract not initialized, skipping blockchain submission");
      return null;
    }
    try {
      const result = await this.contract.methods.submitGrievance(grievanceHash).send({ from: fromAddress });
      return result;
    } catch (error) {
      console.error("Error submitting grievance to blockchain:", error);
      throw error;
    }
  }
  async updateGrievanceStatus(grievanceId, newStatus, officialAddress) {
    try {
      const result = await this.contract.methods.updateGrievanceStatus(grievanceId, newStatus).send({ from: officialAddress });
      return result;
    } catch (error) {
      console.error("Error updating grievance status on blockchain:", error);
      throw error;
    }
  }
  async getGrievance(grievanceId) {
    try {
      const grievance = await this.contract.methods.getGrievance(grievanceId).call();
      return grievance;
    } catch (error) {
      console.error("Error fetching grievance from blockchain:", error);
      throw error;
    }
  }
  async resolveGrievance(grievanceId, officialAddress) {
    try {
      const result = await this.contract.methods.resolveGrievance(grievanceId).send({ from: officialAddress });
      return result;
    } catch (error) {
      console.error("Error resolving grievance on blockchain:", error);
      throw error;
    }
  }
  async addOfficial(officialAddress, ownerAddress) {
    try {
      const result = await this.contract.methods.addOfficial(officialAddress).send({ from: ownerAddress });
      return result;
    } catch (error) {
      console.error("Error adding official to blockchain:", error);
      throw error;
    }
  }
  async isOfficial(address) {
    try {
      const result = await this.contract.methods.officials(address).call();
      return result;
    } catch (error) {
      console.error("Error checking official status on blockchain:", error);
      throw error;
    }
  }
};
var blockchainService = new BlockchainService();

// server/routes.ts
async function registerRoutes(app2) {
  app2.get("/api/grievances", async (req, res) => {
    try {
      const grievances2 = await storage.getAllGrievances();
      res.json(grievances2);
    } catch (error) {
      console.error("Error fetching grievances:", error);
      res.status(500).json({ error: "Failed to fetch grievances" });
    }
  });
  app2.get("/api/grievances/assigned", async (req, res) => {
    try {
      const grievances2 = await storage.getAllGrievances();
      const pendingOrAssigned = grievances2.filter(
        (g) => g.status === "pending" || g.status === "in_progress"
      );
      res.json(pendingOrAssigned);
    } catch (error) {
      console.error("Error fetching assigned grievances:", error);
      res.status(500).json({ error: "Failed to fetch assigned grievances" });
    }
  });
  app2.get("/api/grievances/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const grievance = await storage.getGrievance(id);
      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }
      res.json(grievance);
    } catch (error) {
      console.error("Error fetching grievance:", error);
      res.status(500).json({ error: "Failed to fetch grievance" });
    }
  });
  app2.post("/api/grievances", async (req, res) => {
    try {
      const { fullName, mobileNumber, email, ethereumAddress, userId, ...grievanceData } = req.body;
      const savedGrievance = await storage.createGrievance(
        { ...grievanceData },
        userId,
        fullName,
        mobileNumber
      );
      if (ethereumAddress) {
        try {
          const grievanceHash = `${savedGrievance.id}`;
          await blockchainService.submitGrievance(grievanceHash, ethereumAddress);
          await storage.createBlockchainRecord({
            grievanceId: savedGrievance.id,
            transactionHash: grievanceHash,
            blockchainStatus: "submitted"
          });
        } catch (blockchainError) {
          console.error("Blockchain submission failed:", blockchainError);
        }
      }
      const validatedData = insertGrievanceSchema.parse({
        ...grievanceData,
        email: email || null
      });
      if (!fullName || !mobileNumber) {
        return res.status(400).json({ error: "Full name and mobile number are required" });
      }
      const grievance = await storage.createGrievance(
        validatedData,
        "temp-user-id",
        fullName,
        mobileNumber
      );
      res.status(201).json(grievance);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors
        });
      }
      console.error("Error creating grievance:", error);
      res.status(500).json({ error: "Failed to create grievance" });
    }
  });
  app2.post("/api/grievances/:id/accept", async (req, res) => {
    try {
      const { id } = req.params;
      const { resolutionTimeline } = req.body;
      if (!resolutionTimeline || typeof resolutionTimeline !== "number") {
        return res.status(400).json({ error: "Resolution timeline is required" });
      }
      let officer = await storage.getUserByUsername("panchayat-officer");
      if (!officer) {
        officer = await storage.createUser({
          username: "panchayat-officer",
          password: "temp",
          fullName: "Panchayat Officer",
          mobileNumber: "+919999999999",
          email: "officer@panchayat.gov.in",
          villageName: "Demo Village",
          role: "official"
        });
      }
      const grievance = await storage.acceptGrievance(id, officer.id, resolutionTimeline);
      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }
      res.json(grievance);
    } catch (error) {
      console.error("Error accepting grievance:", error);
      res.status(500).json({ error: "Failed to accept grievance" });
    }
  });
  app2.patch("/api/grievances/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, resolutionNotes, resolutionEvidence } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      const updates = {};
      if (resolutionNotes) updates.resolutionNotes = resolutionNotes;
      if (resolutionEvidence) updates.resolutionEvidence = resolutionEvidence;
      if (status === "resolved") {
        updates.resolvedAt = /* @__PURE__ */ new Date();
        const verificationDeadline = /* @__PURE__ */ new Date();
        verificationDeadline.setDate(verificationDeadline.getDate() + 7);
        updates.verificationDeadline = verificationDeadline;
        updates.status = "pending_verification";
      }
      const grievance = await storage.updateGrievanceStatus(
        id,
        status === "resolved" ? "pending_verification" : status,
        updates
      );
      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }
      res.json(grievance);
    } catch (error) {
      console.error("Error updating grievance status:", error);
      res.status(500).json({ error: "Failed to update grievance status" });
    }
  });
  app2.post("/api/verifications", async (req, res) => {
    try {
      const validatedData = insertVerificationSchema.parse(req.body);
      let verifier = await storage.getUserByUsername("community-verifier");
      if (!verifier) {
        verifier = await storage.createUser({
          username: "community-verifier",
          password: "temp",
          fullName: "Community Verifier",
          mobileNumber: "+919888888888",
          email: "verifier@community.local",
          villageName: "Demo Village",
          role: "citizen"
        });
      }
      const verification = await storage.createVerification(validatedData, verifier.id);
      if (validatedData.verificationType === "verify") {
        await storage.updateGrievanceStatus(verification.grievanceId, "resolved");
      } else if (validatedData.verificationType === "dispute") {
        await storage.updateGrievanceStatus(verification.grievanceId, "in_progress");
      }
      res.status(201).json(verification);
    } catch (error) {
      if (error instanceof z2.ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors
        });
      }
      console.error("Error creating verification:", error);
      res.status(500).json({ error: "Failed to create verification" });
    }
  });
  app2.get("/api/verifications/:grievanceId", async (req, res) => {
    try {
      const { grievanceId } = req.params;
      const verifications2 = await storage.getVerificationsByGrievance(grievanceId);
      res.json(verifications2);
    } catch (error) {
      console.error("Error fetching verifications:", error);
      res.status(500).json({ error: "Failed to fetch verifications" });
    }
  });
  app2.get("/api/blockchain/:grievanceId", async (req, res) => {
    try {
      const { grievanceId } = req.params;
      const records = await storage.getBlockchainRecordsByGrievance(grievanceId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching blockchain records:", error);
      res.status(500).json({ error: "Failed to fetch blockchain records" });
    }
  });
  app2.post("/api/users", async (req, res) => {
    try {
      const user = await storage.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });
  app2.post("/api/auth/signup", async (req, res) => {
    try {
      const { fullName, email, mobileNumber, password, villageName, role } = req.body;
      if (!fullName || !password || !(email || mobileNumber)) {
        return res.status(400).json({ error: "fullName, password and email or mobileNumber are required" });
      }
      if (role === "official") {
        if (!email || !(email.endsWith("@gov.in") || email.endsWith("@nic.in"))) {
          return res.status(400).json({ error: "Officials must register with a verified government email (e.g. @gov.in or @nic.in)" });
        }
      }
      const username = mobileNumber || email;
      const hashed = await bcrypt.hash(password, 10);
      const insert = {
        username,
        password: hashed,
        fullName,
        role: role || "citizen",
        mobileNumber: mobileNumber || "",
        email: email || null,
        villageName: villageName || null
      };
      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ error: "User already exists" });
      }
      const user = await storage.createUser(insert);
      delete user.password;
      const secret = process.env.JWT_SECRET || "dev-secret";
      const token = jwt.sign({ sub: user.id, role: user.role, username: user.username }, secret, { expiresIn: "7d" });
      res.status(201).json({ token, user });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to signup" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return res.status(400).json({ error: "identifier and password required" });
      }
      let user = await storage.getUserByUsername(identifier);
      if (!user && identifier.includes("@")) {
        const [byEmail] = await db.select().from(users).where(eq2(users.email, identifier));
        user = byEmail || void 0;
      }
      if (!user) return res.status(401).json({ error: "Invalid credentials" });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });
      delete user.password;
      const secret = process.env.JWT_SECRET || "dev-secret";
      const token = jwt.sign({ sub: user.id, role: user.role, username: user.username }, secret, { expiresIn: "7d" });
      res.json({ token, user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });
  app2.get("/api/grievances/verification/pending", async (req, res) => {
    try {
      const grievances2 = await storage.getPendingVerificationGrievances();
      res.json(grievances2);
    } catch (error) {
      console.error("Error fetching pending verification grievances:", error);
      res.status(500).json({ error: "Failed to fetch pending verification grievances" });
    }
  });
  app2.post("/api/grievances/:id/user-satisfaction", async (req, res) => {
    try {
      const { id } = req.params;
      const { satisfaction } = req.body;
      if (!satisfaction || !["satisfied", "not_satisfied"].includes(satisfaction)) {
        return res.status(400).json({ error: "Valid satisfaction status required" });
      }
      const grievance = await storage.submitUserSatisfaction(id, satisfaction);
      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }
      res.json(grievance);
    } catch (error) {
      console.error("Error submitting user satisfaction:", error);
      res.status(500).json({ error: "Failed to submit user satisfaction" });
    }
  });
  app2.post("/api/grievances/:id/community-vote", async (req, res) => {
    try {
      const { id } = req.params;
      const { voteType, comments } = req.body;
      if (!voteType || !["verify", "dispute"].includes(voteType)) {
        return res.status(400).json({ error: "Valid vote type required" });
      }
      let voter = await storage.getUserByUsername("community-voter");
      if (!voter) {
        voter = await storage.createUser({
          username: "community-voter",
          password: "temp",
          fullName: "Community Voter",
          mobileNumber: "+919777777777",
          email: "voter@community.local",
          villageName: "Demo Village",
          role: "citizen"
        });
      }
      const grievance = await storage.submitCommunityVote(id, voteType, voter.id, comments);
      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }
      res.json(grievance);
    } catch (error) {
      console.error("Error submitting community vote:", error);
      res.status(500).json({ error: "Failed to submit community vote" });
    }
  });
  app2.post("/api/grievances/:id/escalate", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason || reason.length < 100) {
        return res.status(400).json({ error: "Escalation reason must be at least 100 characters" });
      }
      let officer = await storage.getUserByUsername("panchayat-officer");
      if (!officer) {
        officer = await storage.createUser({
          username: "panchayat-officer",
          password: "temp",
          fullName: "Panchayat Officer",
          mobileNumber: "+919999999999",
          email: "officer@panchayat.gov.in",
          villageName: "Demo Village",
          role: "official"
        });
      }
      const grievance = await storage.escalateGrievance(id, reason, officer.id);
      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }
      res.json(grievance);
    } catch (error) {
      console.error("Error escalating grievance:", error);
      res.status(500).json({ error: "Failed to escalate grievance" });
    }
  });
  app2.post("/api/grievances/:id/cannot-resolve", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      if (!reason || reason.length < 100) {
        return res.status(400).json({ error: "Reason must be at least 100 characters" });
      }
      let officer = await storage.getUserByUsername("panchayat-officer");
      if (!officer) {
        officer = await storage.createUser({
          username: "panchayat-officer",
          password: "temp",
          fullName: "Panchayat Officer",
          mobileNumber: "+919999999999",
          email: "officer@panchayat.gov.in",
          villageName: "Demo Village",
          role: "official"
        });
      }
      const grievance = await storage.cannotResolve(id, reason, officer.id);
      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }
      res.json(grievance);
    } catch (error) {
      console.error("Error marking as cannot resolve:", error);
      res.status(500).json({ error: "Failed to mark as cannot resolve" });
    }
  });
  app2.get("/api/escalation-history/:grievanceId", async (req, res) => {
    try {
      const { grievanceId } = req.params;
      const history = await storage.getEscalationHistory(grievanceId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching escalation history:", error);
      res.status(500).json({ error: "Failed to fetch escalation history" });
    }
  });
  app2.get("/api/admin/disputed", async (req, res) => {
    try {
      const grievances2 = await storage.getDisputedGrievances();
      res.json(grievances2);
    } catch (error) {
      console.error("Error fetching disputed grievances:", error);
      res.status(500).json({ error: "Failed to fetch disputed grievances" });
    }
  });
  app2.get("/api/admin/overdue", async (req, res) => {
    try {
      const grievances2 = await storage.getOverdueGrievances();
      res.json(grievances2);
    } catch (error) {
      console.error("Error fetching overdue grievances:", error);
      res.status(500).json({ error: "Failed to fetch overdue grievances" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      ),
      await import("@replit/vite-plugin-dev-banner").then(
        (m) => m.devBanner()
      )
    ] : []
  ],
  css: {
    postcss: "./postcss.config.js"
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  // Ensure this is correct
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    // Ensure this matches the HTML
    emptyOutDir: true,
    sourcemap: true
    // Added for better debugging
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    },
    proxy: {
      "/api": {
        target: "http://localhost:5003",
        changeOrigin: true,
        secure: false
      }
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use(express.static(path2.resolve(import.meta.dirname, "../client/public")));
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    if (url.startsWith("/api")) {
      return next();
    }
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
import path3 from "path";
import { fileURLToPath } from "url";
var __dirname = path3.dirname(fileURLToPath(import.meta.url));
var app = express2();
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path4 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path4.startsWith("/api")) {
      let logLine = `${req.method} ${path4} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0"
  }, () => {
    log(`serving on port ${port}`);
  });
})();
