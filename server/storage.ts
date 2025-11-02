import {
  users,
  grievances,
  verifications,
  blockchainRecords,
  escalationHistory,
  type User,
  type InsertUser,
  type Grievance,
  type InsertGrievance,
  type Verification,
  type InsertVerification,
  type BlockchainRecord,
  type InsertBlockchainRecord,
  type EscalationHistory,
  type InsertEscalationHistory,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, or, lt, gt, isNull, ne } from "drizzle-orm";
import { recordVerifiedResolution } from './blockchainService';

// Add admin lock threshold (env override allowed)
const ADMIN_LOCK_THRESHOLD = Number(process.env.ADMIN_LOCK_THRESHOLD || 2);

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getAllGrievances(): Promise<Grievance[]>;
  getGrievance(id: string): Promise<Grievance | undefined>;
  getGrievancesByUser(userId: string): Promise<Grievance[]>;
  getAssignedGrievances(officerId: string): Promise<Grievance[]>;
  createGrievance(grievance: {
    title: string;
    description: string;
    category: string;
    villageName: string;
    evidenceFiles?: string[];
    voiceRecordingUrl?: string | null;
    resolutionEvidence?: string[];
  }, userId: string, fullName: string, mobileNumber: string): Promise<Grievance>;
  updateGrievanceStatus(id: string, status: string, updates?: Partial<Grievance>): Promise<Grievance | undefined>;
  acceptGrievance(id: string, officerId: string, resolutionTimeline: number): Promise<Grievance | undefined>;
  
  verifyGrievance(id: string, officerId: string, txHash: string): Promise<Grievance | undefined>;
  createVerification(data: {
    grievanceId: string;
    verificationType: "verify" | "dispute";
    status: "verified" | "disputed";
    comments?: string | null;
    evidenceFiles?: string[];
  }, userId: string): Promise<Verification>;
  getVerificationsByGrievance(grievanceId: string): Promise<Verification[]>;
  
  createBlockchainRecord(record: InsertBlockchainRecord): Promise<BlockchainRecord>;
  getBlockchainRecordsByGrievance(grievanceId: string): Promise<BlockchainRecord[]>;

  // Voice recording support
  saveVoiceRecording(grievanceId: string, url: string, transcription?: string): Promise<Grievance | undefined>;
  
  // Community Verification & User Satisfaction
  submitUserSatisfaction(grievanceId: string, satisfaction: "satisfied" | "not_satisfied"): Promise<Grievance | undefined>;
  submitCommunityVote(grievanceId: string, voteType: "verify" | "dispute", userId: string, comments?: string): Promise<Grievance | undefined>;
  getPendingVerificationGrievances(): Promise<Grievance[]>;
  
  // Escalation Management
  escalateGrievance(grievanceId: string, reason: string, officerId?: string): Promise<Grievance | undefined>;
  createEscalationHistory(history: InsertEscalationHistory): Promise<EscalationHistory>;
  getEscalationHistory(grievanceId: string): Promise<EscalationHistory[]>;
  cannotResolve(grievanceId: string, reason: string, officerId: string): Promise<Grievance | undefined>;
  
  // Admin Panel
  getDisputedGrievances(): Promise<Grievance[]>;
  getOverdueGrievances(): Promise<Grievance[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllGrievances(): Promise<Grievance[]> {
    return await db.select().from(grievances).orderBy(desc(grievances.createdAt));
  }

  async getGrievance(id: string): Promise<Grievance | undefined> {
    const [grievance] = await db.select().from(grievances).where(eq(grievances.id, id));
    return grievance || undefined;
  }

  async getGrievancesByUser(userId: string): Promise<Grievance[]> {
    return await db
      .select()
      .from(grievances)
      .where(eq(grievances.userId, userId))
      .orderBy(desc(grievances.createdAt));
  }

  async getAssignedGrievances(officerId: string): Promise<Grievance[]> {
    return await db
      .select()
      .from(grievances)
      .where(eq(grievances.assignedTo, officerId))
      .orderBy(desc(grievances.createdAt));
  }

  async createGrievance(
    grievance: {
      title: string;
      description: string;
      category: string;
      villageName: string;
      evidenceFiles?: string[];
      voiceRecordingUrl?: string | null;
      resolutionEvidence?: string[];
    },
    userId: string,
    fullName: string,
    mobileNumber: string
  ): Promise<Grievance> {
    // Prefer an explicitly provided userId (for authenticated submissions). If provided
    // and exists, use that user. Otherwise, fall back to username lookup by mobileNumber
    // and create a new user when needed.
    let user;
    if (userId) {
      user = await this.getUser(userId);
    }

    if (!user) {
      user = await this.getUserByUsername(mobileNumber);
    }

    if (!user) {
      // Normalize username to the provided mobile number string
      user = await this.createUser({
        username: mobileNumber,
        password: "temp",
        fullName,
        mobileNumber,
        email: null,
        villageName: grievance.villageName,
        role: "citizen",
      });
    }

    const grievanceNumber = `GR${new Date().getFullYear()}${String(Math.floor(Math.random() * 100000)).padStart(5, '0')}`;

    // Set acceptance deadline (24 hours from now)
    const acceptBy = new Date();
    acceptBy.setDate(acceptBy.getDate() + 1);

    // Ensure arrays are properly handled
    const evidenceFiles = Array.isArray(grievance.evidenceFiles) ? grievance.evidenceFiles : [];
    const resolutionEvidence = Array.isArray(grievance.resolutionEvidence) ? grievance.resolutionEvidence : [];

    const [newGrievance] = await db
      .insert(grievances)
      .values({
        ...grievance,
        userId: user.id,
        grievanceNumber,
        status: "pending",
        priority: "medium",
        evidenceFiles,
        resolutionEvidence,
        acceptBy,
        disputeCount: 0,     // initialization
        adminOnly: false,    // initialization
      })
      .returning();

    const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
    await this.createBlockchainRecord({
      grievanceId: newGrievance.id,
      transactionHash,
      blockNumber: String(Math.floor(Math.random() * 1000000)),
      eventType: "GRIEVANCE_SUBMITTED",
      eventData: JSON.stringify({
        grievanceNumber: newGrievance.grievanceNumber,
        category: newGrievance.category,
        timestamp: new Date().toISOString(),
      }),
    });

    return newGrievance;
  }

  async updateGrievanceStatus(
    id: string,
    status: string,
    updates?: Partial<Grievance>
  ): Promise<Grievance | undefined> {
    const [updated] = await db
      .update(grievances)
      .set({
        status,
        updatedAt: new Date(),
        ...updates,
      })
      .where(eq(grievances.id, id))
      .returning();

    if (updated) {
      // If caller provided a blockchainTxHash in the updates, use it; otherwise create a placeholder record
      const providedTx = (updates as any)?.blockchainTxHash as string | undefined;
      const transactionHash = providedTx || `0x${Math.random().toString(16).substring(2, 66)}`;
      await this.createBlockchainRecord({
        grievanceId: updated.id,
        transactionHash,
        blockNumber: providedTx ? null : String(Math.floor(Math.random() * 1000000)),
        eventType: "STATUS_UPDATED",
        eventData: JSON.stringify({
          grievanceNumber: updated.grievanceNumber,
          newStatus: status,
          timestamp: new Date().toISOString(),
        }),
      });
    }

    return updated || undefined;
  }

  async verifyGrievance(id: string, officerId: string, blockchainTxHash: string): Promise<Grievance | undefined> {
    const verifiedAt = new Date();

    const [updated] = await db
      .update(grievances)
      .set({
        status: "verified",
        blockchainTxHash,
        resolvedAt: verifiedAt,
        verificationDeadline: null,
        updatedAt: verifiedAt
      })
      .where(eq(grievances.id, id))
      .returning();

    if (updated) {
      // Create verification record
      await db.insert(verifications).values({
        grievanceId: id,
        verificationType: "verify",
        status: "verified",
        comments: `Verified on blockchain with transaction: ${blockchainTxHash}`,
        officerId,
        verifiedAt,
      });

      // Create blockchain record
      await this.createBlockchainRecord({
        grievanceId: id,
        transactionHash: blockchainTxHash,
        blockNumber: "pending", // Will be updated when transaction is mined
        eventType: "GRIEVANCE_VERIFIED",
        eventData: JSON.stringify({
          grievanceNumber: updated.grievanceNumber,
          verifiedBy: officerId,
          timestamp: verifiedAt.toISOString(),
        }),
      });
    }

    return updated;
  }

  async acceptGrievance(
    id: string,
    officerId: string,
    resolutionTimeline: number
  ): Promise<Grievance | undefined> {
    // Get the current grievance to check its state
    const grievance = await this.getGrievance(id);
    if (!grievance) {
      throw new Error("Grievance not found");
    }

    // Check if the grievance can be accepted
    if (grievance.status !== "pending") {
      throw new Error("Grievance is not in pending state");
    }

    // Check if we're still within the acceptBy window
    if (grievance.acceptBy && new Date(grievance.acceptBy) < new Date()) {
      throw new Error("Acceptance window has expired");
    }

    // Calculate due date
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + resolutionTimeline);

    // Also set verification deadline (3 days after due date)
    const verificationDeadline = new Date(dueDate);
    verificationDeadline.setDate(verificationDeadline.getDate() + 3);

    const [updated] = await db
      .update(grievances)
      .set({
        status: "in_progress",
        assignedTo: officerId,
        resolutionTimeline,
        dueDate,
        verificationDeadline,
        updatedAt: new Date(),
      })
      .where(eq(grievances.id, id))
      .returning();

    if (updated) {
      const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      await this.createBlockchainRecord({
        grievanceId: updated.id,
        transactionHash,
        blockNumber: String(Math.floor(Math.random() * 1000000)),
        eventType: "TASK_ACCEPTED",
        eventData: JSON.stringify({
          grievanceNumber: updated.grievanceNumber,
          officerId,
          resolutionTimeline,
          dueDate: dueDate.toISOString(),
          timestamp: new Date().toISOString(),
        }),
      });
    }

    return updated || undefined;
  }

  async createVerification(
    data: {
      grievanceId: string;
      verificationType: "verify" | "dispute";
      status: "verified" | "disputed";
      comments?: string | null;
      evidenceFiles?: string[];
    },
    userId: string
  ): Promise<Verification> {
    // First validate that grievance exists
    const grievance = await this.getGrievance(data.grievanceId);
    if (!grievance) {
      throw new Error("Grievance not found");
    }

    const verificationData = {
      ...data,
      userId,
      evidenceFiles: data.evidenceFiles || [],
    };

    // Prevent duplicate votes by the same user for the same grievance.
    // If a verification by this user already exists, return it (no-op).
    const [existing] = await db
      .select()
      .from(verifications)
      .where(eq(verifications.grievanceId, data.grievanceId), eq(verifications.userId, userId));

    if (existing) {
      // Already voted — do not create another verification or modify counters.
      return existing;
    }

    // Check if this is an owner verification
    const isOwnerVerification = userId === grievance.userId && data.verificationType === "verify";

    let verification;
    try {
      // For owner verification, we mark it as auto-verified with a special comment
      const verificationToCreate = {
        ...verificationData,
        comments: isOwnerVerification 
          ? "Owner verified - automatically finalized" 
          : verificationData.comments,
        status: isOwnerVerification ? "verified" : verificationData.status,
      };

      const result = await db
        .insert(verifications)
        .values(verificationToCreate)
        .returning();

      [verification] = result;

      // For owner verifications, use real blockchain recording
      // For community votes, use a mock transaction hash
      let transactionHash: string;
      if (isOwnerVerification) {
        try {
          transactionHash = await recordVerifiedResolution(
            grievance.id,
            grievance.title || '',
            new Date()
          );
          console.log('Owner verification recorded on blockchain:', transactionHash);
        } catch (error) {
          console.error('Failed to record owner verification on blockchain:', error);
          throw new Error('Failed to record owner verification on blockchain');
        }
      } else {
        // Mock transaction for community votes
        transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      }

      // Record the verification in our local blockchain_records table
      await this.createBlockchainRecord({
        grievanceId: grievance.id,
        transactionHash,
        blockNumber: isOwnerVerification ? undefined : String(Math.floor(Math.random() * 1000000)),
        eventType: isOwnerVerification ? "OWNER_VERIFICATION" : "COMMUNITY_VERIFICATION",
        eventData: JSON.stringify({
          grievanceNumber: grievance.grievanceNumber,
          verificationType: verification.verificationType,
          status: verification.status,
          verificationId: verification.id,
          isOwnerVerification,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (err: any) {
      // If insert failed because of a unique constraint (duplicate vote), return the existing verification
      // Postgres duplicate key error code is '23505'
      if (err && (err.code === '23505' || String(err).toLowerCase().includes('duplicate'))) {
        const [existingAfterConflict] = await db
          .select()
          .from(verifications)
          .where(eq(verifications.grievanceId, data.grievanceId), eq(verifications.userId, userId));
        if (existingAfterConflict) return existingAfterConflict;
      }
      // Otherwise rethrow
      throw err;
    }

    // If this verification is a dispute, increment the global dispute counter and possibly lock
    if (verification.verificationType === "dispute") {
      const current = Number(grievance.disputeCount || 0);
      const nextCount = current + 1;

      if (nextCount >= ADMIN_LOCK_THRESHOLD) {
        // lock for admin review (this updates DB and emits blockchain record)
        await this.lockGrievanceForAdmin(grievance.id);
      } else {
        // persist increment
        await db
          .update(grievances)
          .set({ disputeCount: nextCount, updatedAt: new Date() })
          .where(eq(grievances.id, grievance.id));
      }
    }

    return verification;
  }

  async getVerificationsByGrievance(grievanceId: string): Promise<Verification[]> {
    return await db
      .select()
      .from(verifications)
      .where(eq(verifications.grievanceId, grievanceId))
      .orderBy(desc(verifications.createdAt));
  }

  async createBlockchainRecord(record: InsertBlockchainRecord): Promise<BlockchainRecord> {
    const [newRecord] = await db
      .insert(blockchainRecords)
      .values(record)
      .returning();

    return newRecord;
  }

  async getBlockchainRecordsByGrievance(grievanceId: string): Promise<BlockchainRecord[]> {
    return await db
      .select()
      .from(blockchainRecords)
      .where(eq(blockchainRecords.grievanceId, grievanceId))
      .orderBy(desc(blockchainRecords.timestamp));
  }

  // Save voice recording URL and transcription on a grievance
  async saveVoiceRecording(grievanceId: string, url: string, transcription?: string): Promise<Grievance | undefined> {
    const [updated] = await db
      .update(grievances)
      .set({
        voiceRecordingUrl: url,
        voiceTranscription: transcription || null,
        updatedAt: new Date(),
      })
      .where(eq(grievances.id, grievanceId))
      .returning();

    if (updated) {
      const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      await this.createBlockchainRecord({
        grievanceId: updated.id,
        transactionHash,
        blockNumber: String(Math.floor(Math.random() * 1000000)),
        eventType: "VOICE_UPLOADED",
        eventData: JSON.stringify({ grievanceNumber: updated.grievanceNumber, voiceUrl: url, timestamp: new Date().toISOString() }),
      });
    }

    return updated || undefined;
  }

  // Community Verification & User Satisfaction
  async submitUserSatisfaction(
    grievanceId: string,
    satisfaction: "satisfied" | "not_satisfied"
  ): Promise<Grievance | undefined> {
    const [updated] = await db
      .update(grievances)
      .set({
        userSatisfaction: satisfaction,
        userSatisfactionAt: new Date(),
        // Treat user 'satisfied' as final verified state
        status: satisfaction === "satisfied" ? "verified" : "in_progress",
        updatedAt: new Date(),
      })
      .where(eq(grievances.id, grievanceId))
      .returning();

    if (updated) {
      const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      await this.createBlockchainRecord({
        grievanceId: updated.id,
        transactionHash,
        blockNumber: String(Math.floor(Math.random() * 1000000)),
        eventType: "USER_SATISFACTION",
        eventData: JSON.stringify({
          grievanceNumber: updated.grievanceNumber,
          satisfaction,
          timestamp: new Date().toISOString(),
        }),
      });
    }

    return updated || undefined;
  }

  async submitCommunityVote(
    grievanceId: string,
    voteType: "verify" | "dispute",
    userId: string,
    comments?: string
  ): Promise<Grievance | undefined> {
    const grievance = await this.getGrievance(grievanceId);
    if (!grievance) return undefined;

    // Prevent the same user from voting multiple times on the same grievance.
    const [alreadyVoted] = await db
      .select()
      .from(verifications)
      .where(eq(verifications.grievanceId, grievanceId), eq(verifications.userId, userId));

    if (alreadyVoted) {
      // Return current grievance state without modifying counters.
      const refreshed = await this.getGrievance(grievanceId);
      return refreshed || undefined;
    }

    if (grievance.userSatisfaction) {
      return grievance;
    }

    const verifyCount = voteType === "verify" ? grievance.communityVerifyCount + 1 : grievance.communityVerifyCount;
    const disputeCountLocal = voteType === "dispute" ? grievance.communityDisputeCount + 1 : grievance.communityDisputeCount;

    // Do NOT update the global `disputeCount` here. The canonical place
    // to increment and possibly lock for admin is `createVerification`.
    // This avoids double-incrementing when createVerification also runs.

    let newStatus = grievance.status;
    let blockchainTxHash: string | undefined;

    if (voteType === "dispute") {
      newStatus = "in_progress";
    } else if (userId === grievance.userId && voteType === "verify") {
      // If the owner verifies their own grievance, immediately mark as verified
      newStatus = "verified";
      // Record on blockchain immediately for owner verification
      try {
        blockchainTxHash = await recordVerifiedResolution(grievanceId, grievance.title || '', new Date());
        console.log('Owner verification recorded on blockchain, tx hash:', blockchainTxHash);
      } catch (err) {
        console.error('Failed to record owner verification on blockchain:', err);
        throw new Error('Failed to record verification on blockchain');
      }
    } else if (verifyCount >= 3) {
      // community threshold reached — mark as final verified
      newStatus = "verified";
    }

    // Persist community-level counters and status only. Leave global
    // disputeCount to be handled by createVerification.
    await db
      .update(grievances)
      .set({
        communityVerifyCount: verifyCount,
        communityDisputeCount: disputeCountLocal,
        status: newStatus,
        resolvedAt: newStatus === "verified" ? new Date() : undefined,
        updatedAt: new Date(),
        blockchainTxHash: blockchainTxHash
      })
      .where(eq(grievances.id, grievanceId));

    // Create the verification record (this will increment disputeCount
    // and lock the grievance if the threshold is reached).
    await this.createVerification({
      grievanceId: grievanceId,
      verificationType: voteType,
      status: voteType === "verify" ? "verified" : "disputed",
      comments: comments || null,
      evidenceFiles: [],
    }, userId);

    // If the grievance status is now verified by community threshold (owner verification handled above),
    // record it on the blockchain
    if (newStatus === "verified" && !blockchainTxHash) {
      try {
        blockchainTxHash = await recordVerifiedResolution(grievanceId, grievance.title || '', new Date());
        console.log('Community verification recorded on blockchain, tx hash:', blockchainTxHash);

        // Update grievance with blockchain transaction hash
        const [finalized] = await db
          .update(grievances)
          .set({
            blockchainTxHash: blockchainTxHash,
            status: "verified", 
            resolvedAt: new Date(),
            updatedAt: new Date()
          })
          .where(eq(grievances.id, grievanceId))
          .returning();

        if (finalized) {
          await this.createBlockchainRecord({
            grievanceId: grievanceId,
            transactionHash: blockchainTxHash,
            blockNumber: "pending",
            eventType: "GRIEVANCE_VERIFIED",
            eventData: JSON.stringify({
              grievanceNumber: finalized.grievanceNumber,
              verifiedBy: userId,
              timestamp: new Date().toISOString()
            })
          });
          console.log('Blockchain record created for grievance:', grievanceId);
        }
      } catch (err) {
        console.error('Failed to record verification on blockchain for grievance:', grievanceId, err);
        // Do not fail the request — the verification record was created and
        // DB counters updated; the scheduler or admin can finalize later.
      }
    }    // Return the refreshed grievance so the caller sees the final state
    // (including any admin lock applied by createVerification or the immediate owner finalize).
    const refreshed = await this.getGrievance(grievanceId);
    return refreshed || undefined;
  }

  async getPendingVerificationGrievances(currentUserId?: string): Promise<Grievance[]> {
    const baseQuery = db
      .select()
      .from(grievances)
      .where(eq(grievances.status, "pending_verification"));
    
    // If we have a user ID, exclude their own grievances
    if (currentUserId) {
      baseQuery.where(ne(grievances.userId, currentUserId));
    }

    return await baseQuery.orderBy(desc(grievances.resolvedAt));
  }

  // Escalation Management
  async escalateGrievance(
    grievanceId: string,
    reason: string,
    officerId?: string
  ): Promise<Grievance | undefined> {
    const grievance = await this.getGrievance(grievanceId);
    if (!grievance) return undefined;

    const authorityLevels = ["panchayat", "block", "district", "state"];
    const currentIndex = authorityLevels.indexOf(grievance.currentAuthorityLevel);
    const nextLevel = authorityLevels[Math.min(currentIndex + 1, authorityLevels.length - 1)];

    const escalationDueDate = new Date();
    escalationDueDate.setDate(escalationDueDate.getDate() + 10);

    const [updated] = await db
      .update(grievances)
      .set({
        currentAuthorityLevel: nextLevel,
        escalationCount: grievance.escalationCount + 1,
        escalationReason: reason,
        escalationDueDate,
        isEscalated: true,
        escalatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(grievances.id, grievanceId))
      .returning();

    if (updated) {
      await this.createEscalationHistory({
        grievanceId,
        fromLevel: grievance.currentAuthorityLevel,
        toLevel: nextLevel,
        reason,
        escalatedBy: officerId || null,
        autoEscalated: !officerId,
      });

      const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      await this.createBlockchainRecord({
        grievanceId: updated.id,
        transactionHash,
        blockNumber: String(Math.floor(Math.random() * 1000000)),
        eventType: "GRIEVANCE_ESCALATED",
        eventData: JSON.stringify({
          grievanceNumber: updated.grievanceNumber,
          fromLevel: grievance.currentAuthorityLevel,
          toLevel: nextLevel,
          reason,
          autoEscalated: !officerId,
          timestamp: new Date().toISOString(),
        }),
      });
    }

    return updated || undefined;
  }

  async createEscalationHistory(history: InsertEscalationHistory): Promise<EscalationHistory> {
    const [newHistory] = await db
      .insert(escalationHistory)
      .values(history)
      .returning();

    return newHistory;
  }

  async getEscalationHistory(grievanceId: string): Promise<EscalationHistory[]> {
    return await db
      .select()
      .from(escalationHistory)
      .where(eq(escalationHistory.grievanceId, grievanceId))
      .orderBy(desc(escalationHistory.createdAt));
  }

  async cannotResolve(
    grievanceId: string,
    reason: string,
    officerId: string
  ): Promise<Grievance | undefined> {
    const [updated] = await db
      .update(grievances)
      .set({
        canResolve: false,
        escalationReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(grievances.id, grievanceId))
      .returning();

    if (updated) {
      await this.escalateGrievance(grievanceId, reason, officerId);
    }

    return updated || undefined;
  }

  // Admin Panel
  async getDisputedGrievances(): Promise<Grievance[]> {
    // Only return grievances that are actually disputed enough to require
    // admin attention. Previously we returned any with communityDisputeCount
    // > 0 which caused first-time disputes to appear in the admin panel.
    // Now we include grievances where:
    // - userSatisfaction = 'not_satisfied' (explicit unhappy user), or
    // - adminOnly = true (explicitly locked for admin review), or
    // - disputeCount >= ADMIN_LOCK_THRESHOLD (global dispute threshold reached).
    const thresholdMinusOne = Math.max(0, ADMIN_LOCK_THRESHOLD - 1);
    return await db
      .select()
      .from(grievances)
      .where(or(
        eq(grievances.userSatisfaction, "not_satisfied"),
        eq(grievances.adminOnly, true),
        // Use greater-than with (threshold - 1) to express >= threshold
        gt(grievances.disputeCount, thresholdMinusOne)
      ))
      .orderBy(desc(grievances.updatedAt));
  }

  async getOverdueGrievances(): Promise<Grievance[]> {
    const now = new Date();
    return await db
      .select()
      .from(grievances)
      .where(
        and(
          lt(grievances.dueDate, now),
          or(
            eq(grievances.status, "pending"),
            eq(grievances.status, "in_progress")
          )
        )
      )
      .orderBy(desc(grievances.dueDate));
  }

  // Add helper to lock a grievance for admin review
  async lockGrievanceForAdmin(id: string): Promise<Grievance | undefined> {
    const [updated] = await db
      .update(grievances)
      .set({
        adminOnly: true,
        status: "admin_review",
        updatedAt: new Date(),
      })
      .where(eq(grievances.id, id))
      .returning();

    if (updated) {
      const transactionHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      await this.createBlockchainRecord({
        grievanceId: updated.id,
        transactionHash,
        blockNumber: String(Math.floor(Math.random() * 1000000)),
        eventType: "LOCKED_FOR_ADMIN",
        eventData: JSON.stringify({
          grievanceNumber: updated.grievanceNumber,
          reason: "dispute threshold reached",
          timestamp: new Date().toISOString(),
        }),
      });
    }

    return updated || undefined;
  }
} // end class DatabaseStorage

// export a single storage instance
export const storage = new DatabaseStorage();
