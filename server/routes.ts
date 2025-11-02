import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage as dbStorage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { insertGrievanceSchema, insertVerificationSchema } from "@shared/schema";
import { z } from "zod";
import { blockchainService } from "./blockchain";
import { recordVerifiedResolution } from './blockchainService';
import multer from 'multer';
import { uploadToCloudinary, uploadMultipleToCloudinary } from './cloudinary';

// Configure multer for memory storage
const multerStorage = multer.memoryStorage();
const upload = multer({
  storage: multerStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per request
  },
  fileFilter: (req, file, cb: any) => {
    // Allow images and audio files
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(null, false);
      cb(new Error('Invalid file type. Only images and audio files are allowed.'));
    }
  }
});

// Add threshold for locking a grievance to admin-only handling
const ADMIN_LOCK_THRESHOLD = 2;

export async function registerRoutes(app: Express): Promise<Server> {
  // --- Auth helpers / middleware -------------------------------------------------
  const jwtSecret = process.env.JWT_SECRET || "dev-secret";

  function authenticate(req: any, res: any, next: any) {
    const auth = req.headers?.authorization;
    if (!auth) return res.status(401).json({ error: "Missing Authorization header" });
    const parts = auth.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") return res.status(401).json({ error: "Invalid Authorization header format" });
    const token = parts[1];
    try {
      const payload = jwt.verify(token, jwtSecret) as any;
      req.auth = payload;
      next();
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  }

  function requireAdmin(req: any, res: any, next: any) {
    if (!req.auth || req.auth.role !== "admin") return res.status(403).json({ error: "Admin privileges required" });
    next();
  }

  // Helper: get or create a demo user in development only (or when ALLOW_DEMO_USERS=true)
  async function getOrCreateDemoUser(username: string, defaults: any) {
    const allow = process.env.NODE_ENV === 'development' || process.env.ALLOW_DEMO_USERS === 'true';
    if (!allow) {
      throw new Error('Demo users are disabled in this environment');
    }
    let user = await dbStorage.getUserByUsername(username);
    if (!user) {
      user = await dbStorage.createUser({ ...defaults, username });
    }
    return user;
  }

  app.get("/api/grievances", async (req, res) => {
    try {
      const grievances = await dbStorage.getAllGrievances();
      res.json(grievances);
    } catch (error) {
      console.error("Error fetching grievances:", error);
      res.status(500).json({ error: "Failed to fetch grievances" });
    }
  });

  // Get grievances for authenticated user
  app.get("/api/grievances/my", authenticate, async (req: any, res) => {
    try {
      const userId = req.auth.sub || req.auth.id;
      if (!userId) {
        return res.status(401).json({ error: "User ID not found in token" });
      }
      const grievances = await dbStorage.getGrievancesByUser(userId);
      res.json(grievances);
    } catch (error) {
      console.error("Error fetching user grievances:", error);
      res.status(500).json({ error: "Failed to fetch your grievances" });
    }
  });

  app.get("/api/grievances/assigned", async (req, res) => {
    try {
      const grievances = await dbStorage.getAllGrievances();
      const pendingOrAssigned = grievances.filter(
        g => g.status === "pending" || g.status === "in_progress"
      );
      res.json(pendingOrAssigned);
    } catch (error) {
      console.error("Error fetching assigned grievances:", error);
      res.status(500).json({ error: "Failed to fetch assigned grievances" });
    }
  });

  app.put("/api/grievances/:id/resolve", authenticate, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { resolutionNotes } = req.body;
      
      if (!id || !resolutionNotes) {
        return res.status(400).json({ error: "Both ID and resolution notes are required" });
      }

      const grievance = await dbStorage.getGrievance(id);
      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }

      // If grievance is locked for admin review, only admins can resolve it
      if (grievance.adminOnly && req.auth?.role !== 'admin') {
        return res.status(403).json({ error: "This grievance has been locked for admin review" });
      }

      // Verify that the grievance is in the correct state
      if (grievance.status !== 'in_progress') {
        return res.status(400).json({ error: "Grievance must be in progress to be resolved" });
      }

      // Add resolution details
      const updates: any = {
        resolutionNotes,
        resolvedAt: new Date(),
        resolvedBy: req.auth.sub || req.auth.id,
        status: 'pending_verification'
      };

      // Set verification deadline to 7 days from now
      const verificationDeadline = new Date();
      verificationDeadline.setDate(verificationDeadline.getDate() + 7);
      updates.verificationDeadline = verificationDeadline;

      const updatedGrievance = await dbStorage.updateGrievanceStatus(id, 'pending_verification', updates);
      res.json(updatedGrievance);

    } catch (error) {
      console.error("Error resolving grievance:", error);
      res.status(500).json({ error: "Failed to resolve grievance" });
    }
  });

  app.get("/api/grievances/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const grievance = await dbStorage.getGrievance(id);
      
      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }
      
      // Get additional details for the grievance
      const [verifications, escalationHistory] = await Promise.all([
        dbStorage.getVerificationsByGrievance(id),
        dbStorage.getEscalationHistory(id)
      ]);
      
      res.json({
        ...grievance,
        verifications,
        escalationHistory
      });
    } catch (error) {
      console.error("Error fetching grievance:", error);
      res.status(500).json({ error: "Failed to fetch grievance" });
    }
  });

  // Upload a voice recording (single file) for an existing grievance and get transcription
  app.post("/api/grievances/:id/evidence/audio", upload.single('audio'), async (req: any, res: any) => {
    try {
      const { id } = req.params;
      if (!id) return res.status(400).json({ error: "Grievance ID required" });

      if (!req.file) {
        return res.status(400).json({ error: "No audio file uploaded. Attach as 'audio' field." });
      }

      // Upload to cloudinary (or other configured uploader)
      let uploadedUrl: string | null = null;
      try {
        const result = await uploadToCloudinary(req.file);
        uploadedUrl = (result as any)?.secure_url || null;
      } catch (uploadErr) {
        console.error('Audio upload failed:', uploadErr);
        return res.status(500).json({ error: 'Failed to upload audio' });
      }

      // Get transcription using OpenAI Whisper
      let transcription: string | null = null;
      try {
        if (process.env.OPENAI_API_KEY && req.file && req.file.buffer) {
          const { transcribeAudio } = await import('./transcriptionService');
          transcription = await transcribeAudio(
            req.file.buffer,
            req.file.originalname || `voice-${Date.now()}.webm`
          );
        } else {
          console.log('OpenAI API key not configured');
        }
      } catch (sttErr) {
        console.error('STT error:', sttErr);
      }

      // If transcription failed, return an error
      if (!transcription && uploadedUrl) {
        return res.status(500).json({ 
          error: 'Failed to transcribe audio',
          voiceRecordingUrl: uploadedUrl 
        });
      }

      // Save to DB via storage helper
      const updated = await dbStorage.saveVoiceRecording(id, uploadedUrl as string, transcription);

      if (!updated) {
        return res.status(404).json({ error: 'Grievance not found' });
      }

      res.json({ voiceRecordingUrl: uploadedUrl, voiceTranscription: transcription, grievance: updated });
    } catch (error) {
      console.error('Error uploading voice recording:', error);
      res.status(500).json({ error: 'Failed to process audio upload' });
    }
  });

  // Translation proxy to Google Translate API (v2)
  app.post('/api/translate', async (req: any, res: any) => {
    try {
      const { texts, target } = req.body as { texts?: string[]; target?: string };
      if (!texts || !Array.isArray(texts) || texts.length === 0) {
        return res.status(400).json({ error: 'texts[] required' });
      }
      const tgt = target || 'hi';
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'Google API key not configured on server' });
      }

      const params = new URLSearchParams();
      texts.forEach(t => params.append('q', t));
      params.append('target', tgt);
      params.append('format', 'text');

      const url = `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`;
      const gRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (!gRes.ok) {
        const txt = await gRes.text();
        console.error('Google Translate error', gRes.status, txt);
        return res.status(502).json({ error: 'Google Translate error', details: txt });
      }

      const json = await gRes.json();
      const translations = (json.data?.translations || []).map((t: any) => t.translatedText);
      res.json({ translations });
    } catch (err) {
      console.error('Translate proxy error', err);
      res.status(500).json({ error: 'Translate failed' });
    }
  });

  // Officers must be authenticated to accept a grievance — use their JWT sub as officer id
  app.post("/api/grievances/:id/accept", authenticate, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { resolutionTimeline } = req.body;

      // Safely read authenticated user id (support both sub and id)
      const officerIdFromAuth = req.auth?.sub || req.auth?.id;
      if (!officerIdFromAuth) {
        return res.status(401).json({ error: "Authenticated user id not found in token" });
      }

      // Accept string or number timeline, normalize to integer
      const timeline = Number(resolutionTimeline);
      if (!Number.isInteger(timeline) || timeline < 1 || timeline > 30) {
        return res.status(400).json({ error: "Resolution timeline must be an integer between 1 and 30 days" });
      }

      // Prefer the authenticated user's id if they're an official
      let officerId: string | undefined = undefined;
      if (req.auth && req.auth.role === 'official') {
        officerId = officerIdFromAuth;
      }

      // fallback default officer (for tests/dev)
      if (!officerId) {
        try {
          const officer = await getOrCreateDemoUser('panchayat-officer', {
            password: 'temp',
            fullName: 'Panchayat Officer',
            mobileNumber: '+919999999999',
            email: 'officer@panchayat.gov.in',
            villageName: 'Demo Village',
            role: 'official',
          });
          officerId = officer.id;
        } catch (err: any) {
          return res.status(403).json({ error: 'Demo officer account not available; authenticate as an official' });
        }
      }

      // Enforce admin-only lock
      const grievance = await dbStorage.getGrievance(id);
      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }
      if (grievance.adminOnly && req.auth?.role !== 'admin') {
        return res.status(403).json({ error: "This grievance has been locked for admin review" });
      }

      const accepted = await dbStorage.acceptGrievance(id, officerId as string, timeline);
      
      if (!accepted) {
        return res.status(404).json({ error: "Grievance not found" });
      }
      
      res.json(accepted);
    } catch (error) {
      console.error("Error accepting grievance:", error);
      res.status(500).json({ error: "Failed to accept grievance" });
    }
  });

  app.post("/api/grievances", upload.fields([
    { name: 'evidenceFiles', maxCount: 5 },
    { name: 'voiceRecording', maxCount: 1 }
  ]), async (req, res) => {
    try {
      const { fullName, mobileNumber, email, ethereumAddress, userId, ...grievanceData } = req.body;
      // If an Authorization header with a valid JWT is present, prefer the authenticated user's id
      let userIdFromAuth: string | undefined = undefined;
      try {
        const authHeader = req.headers?.authorization as string | undefined;
        if (authHeader) {
          const parts = authHeader.split(' ');
          if (parts.length === 2 && parts[0] === 'Bearer') {
            const payload = jwt.verify(parts[1], jwtSecret) as any;
            userIdFromAuth = payload.sub || payload.id || undefined;
          }
        }
      } catch (e) {
        // ignore invalid token and proceed (submission may be anonymous)
      }
      if (!fullName || !mobileNumber) {
        return res.status(400).json({ error: "Full name and mobile number are required" });
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      let evidenceUrls: string[] = [];
      let voiceUrl: string | null = null;

      try {
        // Upload evidence files if any
        if (files['evidenceFiles']?.length > 0) {
          const evidenceResults = await uploadMultipleToCloudinary(files['evidenceFiles']);
          evidenceUrls = evidenceResults.map((result: any) => result.secure_url);
        }

        // Upload voice recording if any
        if (files['voiceRecording']?.[0]) {
          const voiceResult = await uploadToCloudinary(files['voiceRecording'][0]);
          voiceUrl = (voiceResult as any).secure_url;
        }
      } catch (uploadError) {
        console.error('Error uploading files:', uploadError);
        return res.status(500).json({ error: 'Failed to upload files' });
      }

      try {
        // Validate input
        const validatedData = insertGrievanceSchema.parse({
          ...grievanceData,
          email: email || null,
          evidenceFiles: evidenceUrls,
          voiceRecordingUrl: voiceUrl,
        });

        const payload = {
          ...validatedData,
          resolutionEvidence: [], // Initialize empty resolution evidence array
        };

      // Persist grievance
      const grievance = await dbStorage.createGrievance(
        payload as any,
        // prefer authenticated user id, then any userId passed in body, otherwise undefined
        userIdFromAuth || userId,
        fullName,
        mobileNumber
      );

      // Store on blockchain if address provided
      if (ethereumAddress) {
        try {
          const grievanceHash = `${grievance.id}`;
          await blockchainService.submitGrievance(grievanceHash, ethereumAddress);

          // Store blockchain record
          await dbStorage.createBlockchainRecord({
            grievanceId: grievance.id,
            transactionHash: grievanceHash,
            blockNumber: String(Math.floor(Math.random() * 1000000)),
            eventType: "GRIEVANCE_SUBMITTED",
            eventData: JSON.stringify({ grievanceNumber: grievance.grievanceNumber }),
          });
        } catch (blockchainError) {
          console.error('Blockchain submission failed:', blockchainError);
        }
      }

      res.status(201).json(grievance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors 
        });
      }
      console.error("Error creating grievance:", error);
      res.status(500).json({ error: "Failed to create grievance" });
    }
  } catch (error) {
    console.error("Unexpected error in /api/grievances:", error);
    res.status(500).json({ error: "Failed to create grievance" });
  }
  });

  app.patch("/api/grievances/:id/status", authenticate, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { status, resolutionNotes, resolutionEvidence } = req.body;
      
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const grievance = await dbStorage.getGrievance(id);
      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }

      // If locked for admin review, only admins can change status
      if (grievance.adminOnly && req.auth?.role !== 'admin') {
        return res.status(403).json({ error: "This grievance has been locked for admin review" });
      }

      const updates: any = {};
      if (resolutionNotes) updates.resolutionNotes = resolutionNotes;
      if (resolutionEvidence) updates.resolutionEvidence = resolutionEvidence;
      
      if (status === "resolved") {
        updates.resolvedAt = new Date();
        const verificationDeadline = new Date();
        verificationDeadline.setDate(verificationDeadline.getDate() + 7);
        updates.verificationDeadline = verificationDeadline;
        updates.status = "pending_verification";
      }

      const updated = await dbStorage.updateGrievanceStatus(
        id,
        status === "resolved" ? "pending_verification" : status,
        updates
      );
      
      if (!updated) {
        return res.status(404).json({ error: "Grievance not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating grievance status:", error);
      res.status(500).json({ error: "Failed to update grievance status" });
    }
  });

  app.post("/api/verifications", async (req, res) => {
    try {
      const validatedData = insertVerificationSchema.parse(req.body);
      
      let verifierId: string;
      try {
        const verifier = await getOrCreateDemoUser('community-verifier', {
          password: 'temp',
          fullName: 'Community Verifier',
          mobileNumber: '+919888888888',
          email: 'verifier@community.local',
          villageName: 'Demo Village',
          role: 'citizen',
        });
        verifierId = verifier.id;
      } catch (err: any) {
        return res.status(403).json({ error: 'Demo verifier account not available; authenticate as a real user' });
      }

      const verification = await dbStorage.createVerification(validatedData as any, verifierId);

      // If verification is a verify, mark grievance resolved. For disputes,
      // the storage layer already increments dispute counters and will lock
      // the grievance when the threshold is reached, so do not modify
      // dispute counts here (avoids double-incrementing).
      if (validatedData.verificationType === "verify") {
        await dbStorage.updateGrievanceStatus(verification.grievanceId, "resolved");
      }
      
      res.status(201).json(verification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Validation failed", 
          details: error.errors 
        });
      }
      console.error("Error creating verification:", error);
      res.status(500).json({ error: "Failed to create verification" });
    }
  });

  app.get("/api/verifications/:grievanceId", async (req, res) => {
    try {
      const { grievanceId } = req.params;
  const verifications = await dbStorage.getVerificationsByGrievance(grievanceId);
      res.json(verifications);
    } catch (error) {
      console.error("Error fetching verifications:", error);
      res.status(500).json({ error: "Failed to fetch verifications" });
    }
  });

  app.get("/api/blockchain/:grievanceId", async (req, res) => {
    try {
      const { grievanceId } = req.params;
  const records = await dbStorage.getBlockchainRecordsByGrievance(grievanceId);
      res.json(records);
    } catch (error) {
      console.error("Error fetching blockchain records:", error);
      res.status(500).json({ error: "Failed to fetch blockchain records" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
  const user = await dbStorage.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  // Auth endpoints: signup and login (JWT)
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { fullName, email, mobileNumber, password, villageName, role } = req.body;

      if (!fullName || !password || !(email || mobileNumber)) {
        return res.status(400).json({ error: "fullName, password and email or mobileNumber are required" });
      }

      // Public signup restrictions:
      // - creation of 'official' accounts must be performed by an ADMIN via the admin-only endpoint
      // - creation of 'admin' accounts is blocked for public signup by default; see bootstrap options below
      if (role === "official") {
        return res.status(403).json({ error: "Officials must be created by an admin. Use the admin-only endpoint /api/admin/create-official." });
      }

      // Allow admin creation only via special bootstrap code if explicitly enabled via env var
      if (role === "admin") {
        const adminCodeProvided = (req.body.adminCode || null) as string | null;
        const allowed = process.env.ALLOW_ADMIN_SELF_SIGNUP === "true" && process.env.ADMIN_CREATION_CODE && adminCodeProvided === process.env.ADMIN_CREATION_CODE;
        if (!allowed) {
          return res.status(403).json({ error: "Creating admin accounts via public signup is disabled. Contact an existing admin or bootstrap one via env/seed." });
        }
      }

      // If role is official (shouldn't reach here due to reject), validate government email domains as extra guard
      if (role === "official") {
        if (!email || !(email.endsWith("@gov.in") || email.endsWith("@nic.in"))) {
          return res.status(400).json({ error: "Officials must register with a verified government email (e.g. @gov.in or @nic.in)" });
        }
      }

      // create username from mobileNumber if present, otherwise from email
      const username = mobileNumber || email;

      // hash password
      const hashed = await bcrypt.hash(password, 10);

      const insert = {
        username,
        password: hashed,
        fullName,
        role: role || "citizen",
        mobileNumber: mobileNumber || "",
        email: email || null,
        villageName: villageName || null,
      };

      const existing = await dbStorage.getUserByUsername(username);
      if (existing) {
        return res.status(409).json({ error: "User already exists" });
      }

      const user = await dbStorage.createUser(insert as any);
      // remove password before returning
      // @ts-ignore
      delete user.password;

      // sign token
      const secret = process.env.JWT_SECRET || "dev-secret";
      const token = jwt.sign({ sub: user.id, role: user.role, username: user.username }, secret, { expiresIn: "7d" });

      res.status(201).json({ token, user });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to signup" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { identifier, password } = req.body; // identifier = email or mobile
      if (!identifier || !password) {
        return res.status(400).json({ error: "identifier and password required" });
      }

      let user = await dbStorage.getUserByUsername(identifier);
      if (!user && identifier.includes("@")) {
        // try by email
        const [byEmail] = await db.select().from(users).where(eq(users.email, identifier));
        user = byEmail || undefined;
      }

      if (!user) return res.status(401).json({ error: "Invalid credentials" });

      const valid = await bcrypt.compare(password, user.password as string);
      if (!valid) return res.status(401).json({ error: "Invalid credentials" });

      // remove password before returning
      // @ts-ignore
      delete user.password;

      const secret = process.env.JWT_SECRET || "dev-secret";
      const token = jwt.sign({ sub: user.id, role: user.role, username: user.username }, secret, { expiresIn: "7d" });

      res.json({ token, user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  // Admin-only: create an Official account
  // Use Authorization: Bearer <admin-token>
  app.post("/api/admin/create-official", authenticate, requireAdmin, async (req, res) => {
    try {
      const { fullName, email, mobileNumber, password, villageName, username } = req.body;
      if (!fullName || !email || !password) {
        return res.status(400).json({ error: "fullName, email and password are required" });
      }

      // enforce government email for officials
      if (!(email.endsWith("@gov.in") || email.endsWith("@nic.in"))) {
        return res.status(400).json({ error: "Officials must use a verified government email (e.g. @gov.in or @nic.in)" });
      }

      const userNameToUse = username || mobileNumber || email;
  const existing = await dbStorage.getUserByUsername(userNameToUse);
      if (existing) return res.status(409).json({ error: "User already exists" });

      const hashed = await bcrypt.hash(password, 10);
      const insert = {
        username: userNameToUse,
        password: hashed,
        fullName,
        role: "official",
        mobileNumber: mobileNumber || "",
        email: email || null,
        villageName: villageName || null,
      };

  const user = await dbStorage.createUser(insert as any);
      // @ts-ignore
      delete user.password;

      res.status(201).json({ user });
    } catch (error) {
      console.error("Error creating official:", error);
      res.status(500).json({ error: "Failed to create official" });
    }
  });

  // Admin-only: create an Admin account
  // Use Authorization: Bearer <admin-token>
  app.post("/api/admin/create-admin", authenticate, requireAdmin, async (req, res) => {
    try {
      const { fullName, email, mobileNumber, password, villageName, username } = req.body;
      if (!fullName || !email || !password) {
        return res.status(400).json({ error: "fullName, email and password are required" });
      }

      const userNameToUse = username || mobileNumber || email;
  const existing = await dbStorage.getUserByUsername(userNameToUse);
  if (existing) return res.status(409).json({ error: "User already exists" });

      const hashed = await bcrypt.hash(password, 10);
      const insert = {
        username: userNameToUse,
        password: hashed,
        fullName,
        role: "admin",
        mobileNumber: mobileNumber || "",
        email: email || null,
        villageName: villageName || null,
      };

  const user = await dbStorage.createUser(insert as any);
      // @ts-ignore
      delete user.password;

      res.status(201).json({ user });
    } catch (error) {
      console.error("Error creating admin:", error);
      res.status(500).json({ error: "Failed to create admin" });
    }
  });

  // Community Verification Routes
  app.get("/api/grievances/verification/pending", authenticate, async (req: any, res) => {
    try {
      // Get current user ID from JWT token
      const userId = req.user?.id;
      const grievances = await dbStorage.getPendingVerificationGrievances(userId);
      res.json(grievances);
    } catch (error) {
      console.error("Error fetching pending verification grievances:", error);
      res.status(500).json({ error: "Failed to fetch pending verification grievances" });
    }
  });

  app.post("/api/grievances/:id/user-satisfaction", async (req, res) => {
    try {
      const { id } = req.params;
      const { satisfaction } = req.body;

      if (!satisfaction || !["satisfied", "not_satisfied"].includes(satisfaction)) {
        return res.status(400).json({ error: "Valid satisfaction status required" });
      }

  const grievance = await dbStorage.submitUserSatisfaction(id, satisfaction);

      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }

      res.json(grievance);
    } catch (error) {
      console.error("Error submitting user satisfaction:", error);
      res.status(500).json({ error: "Failed to submit user satisfaction" });
    }
  });

  app.post("/api/grievances/:id/community-vote", async (req, res) => {
    try {
      const { id } = req.params;
      const { voteType, comments } = req.body;

      if (!voteType || !["verify", "dispute"].includes(voteType)) {
        return res.status(400).json({ error: "Valid vote type required" });
      }

      // If the request is authenticated, prefer the authenticated user's id
      let voterId: string | undefined = undefined;
      try {
        const authHeader = req.headers?.authorization as string | undefined;
        if (authHeader) {
          const parts = authHeader.split(' ');
          if (parts.length === 2 && parts[0] === 'Bearer') {
            // verify token manually (same approach used elsewhere)
            const payload = jwt.verify(parts[1], jwtSecret) as any;
            voterId = payload.sub || payload.id || undefined;
          }
        }
      } catch (e) {
        // ignore invalid token and fall back to community-voter
        voterId = undefined;
      }

      if (!voterId) {
        try {
          const voter = await getOrCreateDemoUser('community-voter', {
            password: 'temp',
            fullName: 'Community Voter',
            mobileNumber: '+919777777777',
            email: 'voter@community.local',
            villageName: 'Demo Village',
            role: 'citizen',
          });
          voterId = voter.id;
        } catch (err: any) {
          return res.status(403).json({ error: 'Demo voter account not available; authenticate as a real user' });
        }
      }

      const grievance = await dbStorage.submitCommunityVote(id, voteType, voterId, comments);

      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }

      // The storage layer already updates community counts and the global
      // disputeCount and will lock the grievance when the threshold is reached.
      // Return the result from storage directly.
      res.json(grievance);
    } catch (error) {
      console.error("Error submitting community vote:", error);
      res.status(500).json({ error: "Failed to submit community vote" });
    }
  });

  // Owner quick-verify: authenticated grievance owner can verify their own report
  app.post("/api/grievances/:id/owner-verify", authenticate, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const userId = req.auth?.sub || req.auth?.id;

      if (!userId) return res.status(401).json({ error: 'User id not found in token' });

      const grievance = await dbStorage.getGrievance(id);
      if (!grievance) return res.status(404).json({ error: 'Grievance not found' });

      if (grievance.userId !== userId) return res.status(403).json({ error: 'Only the original submitter can perform owner-verify' });

      // Submit a community vote on behalf of the owner — storage handles marking verified and blockchain recording
      const updated = await dbStorage.submitCommunityVote(id, 'verify', userId, 'Owner verified');
      if (!updated) return res.status(500).json({ error: 'Failed to verify grievance' });

      res.json(updated);
    } catch (err) {
      console.error('Error in owner-verify:', err);
      res.status(500).json({ error: 'Failed to perform owner verify' });
    }
  });

  // Escalation Routes
  app.post("/api/grievances/:id/escalate", async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || reason.length < 100) {
        return res.status(400).json({ error: "Escalation reason must be at least 100 characters" });
      }

      let officerIdForEscalation: string;
      try {
        const officer = await getOrCreateDemoUser('panchayat-officer', {
          password: 'temp',
          fullName: 'Panchayat Officer',
          mobileNumber: '+919999999999',
          email: 'officer@panchayat.gov.in',
          villageName: 'Demo Village',
          role: 'official',
        });
        officerIdForEscalation = officer.id;
      } catch (err: any) {
        return res.status(403).json({ error: 'Demo officer account not available; authenticate as an official' });
      }

      const grievance = await dbStorage.escalateGrievance(id, reason, officerIdForEscalation);

      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }

      res.json(grievance);
    } catch (error) {
      console.error("Error escalating grievance:", error);
      res.status(500).json({ error: "Failed to escalate grievance" });
    }
  });

  app.post("/api/grievances/:id/cannot-resolve", authenticate, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason || reason.length < 100) {
        return res.status(400).json({ error: "Reason must be at least 100 characters" });
      }

      // If authenticated official, use their id as the officer
      let officerId: string | undefined = undefined;
      if ((req as any).auth && (req as any).auth.role === 'official') {
        officerId = (req as any).auth.sub;
      }

      if (!officerId) {
        let officer = await dbStorage.getUserByUsername("panchayat-officer");
          if (!officer) {
            officer = await dbStorage.createUser({
            username: "panchayat-officer",
            password: "temp",
            fullName: "Panchayat Officer",
            mobileNumber: "+919999999999",
            email: "officer@panchayat.gov.in",
            villageName: "Demo Village",
            role: "official",
          });
        }
        officerId = officer.id;
      }

  const grievance = await dbStorage.cannotResolve(id, reason, officerId);

      if (!grievance) {
        return res.status(404).json({ error: "Grievance not found" });
      }

      res.json(grievance);
    } catch (error) {
      console.error("Error marking as cannot resolve:", error);
      res.status(500).json({ error: "Failed to mark as cannot resolve" });
    }
  });

  app.get("/api/escalation-history/:grievanceId", async (req, res) => {
    try {
      const { grievanceId } = req.params;
  const history = await dbStorage.getEscalationHistory(grievanceId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching escalation history:", error);
      res.status(500).json({ error: "Failed to fetch escalation history" });
    }
  });

  // Admin Panel Routes
  app.get("/api/admin/disputed", async (req, res) => {
    try {
  const grievances = await dbStorage.getDisputedGrievances();
      res.json(grievances);
    } catch (error) {
      console.error("Error fetching disputed grievances:", error);
      res.status(500).json({ error: "Failed to fetch disputed grievances" });
    }
  });

  app.get("/api/admin/overdue", async (req, res) => {
    try {
  const grievances = await dbStorage.getOverdueGrievances();
      res.json(grievances);
    } catch (error) {
      console.error("Error fetching overdue grievances:", error);
      res.status(500).json({ error: "Failed to fetch overdue grievances" });
    }
  });

  // Admin-only: manually verify (finalize) a grievance and record on-chain
  app.post('/api/admin/manual-verify/:id', authenticate, requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const grievance = await dbStorage.getGrievance(id);
      if (!grievance) return res.status(404).json({ error: 'Grievance not found' });

      // Only finalize grievances that are pending_verification or admin_review
      if (grievance.status !== 'pending_verification' && grievance.status !== 'admin_review') {
        return res.status(400).json({ error: 'Grievance is not pending verification or admin review' });
      }

      // Call blockchain to record the verified resolution
      try {
  const txHash = await recordVerifiedResolution(grievance.id, grievance.title || '', new Date());
  // Update DB with verified status and store blockchain tx hash
  const updated = await dbStorage.updateGrievanceStatus(grievance.id, 'verified', { resolvedAt: new Date(), blockchainTxHash: txHash });
        return res.json({ grievance: updated, txHash });
      } catch (blockErr) {
        console.error('Admin manual verify: blockchain call failed:', blockErr);
        return res.status(500).json({ error: 'Blockchain transaction failed', details: (blockErr as any)?.message || String(blockErr) });
      }

    } catch (err) {
      console.error('Admin manual verify error:', err);
      return res.status(500).json({ error: 'Failed to manual-verify grievance' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
