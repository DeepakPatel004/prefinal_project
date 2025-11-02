import { Router } from 'express';
import { upload } from '../middleware/upload';
import { uploadToCloudinary, uploadMultipleToCloudinary } from '../cloudinary';
import { storage } from '../storage';
import { authenticate } from '../middleware/auth.ts';
import blockchainService from '../blockchainService';
import { z } from 'zod';

const router = Router();

// Schema for task acceptance
const acceptTaskSchema = z.object({
  resolutionTimeline: z.number().min(1).max(30),
});

// Accept a grievance task
router.post('/:id/accept', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionTimeline } = acceptTaskSchema.parse(req.body);
  const officerId = (req as any).auth?.userId || (req as any).auth?.sub;

    const grievance = await storage.getGrievance(id);
    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    if (grievance.status !== 'pending') {
      return res.status(400).json({ error: 'Grievance is not in pending state' });
    }

    // Check if we're still within the acceptBy window
    if (grievance.acceptBy && new Date(grievance.acceptBy) < new Date()) {
      return res.status(400).json({ error: 'Acceptance window has expired' });
    }

    const updatedGrievance = await storage.acceptGrievance(id, officerId, resolutionTimeline);
    if (!updatedGrievance) {
      return res.status(500).json({ error: 'Failed to accept grievance' });
    }

    res.json(updatedGrievance);
  } catch (error) {
    console.error('Error accepting grievance:', error);
    res.status(500).json({ error: 'Failed to accept grievance' });
  }
});

// Submit a new grievance with file uploads
router.post('/', upload.fields([
  { name: 'evidenceFiles', maxCount: 5 },
  { name: 'voiceRecording', maxCount: 1 }
]), async (req, res) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const evidenceFiles = files['evidenceFiles'] || [];
    const voiceRecording = files['voiceRecording']?.[0];

    // Upload files to Cloudinary
    const evidenceUrls = evidenceFiles.length > 0 ? 
      await uploadMultipleToCloudinary(evidenceFiles) : [];
    const voiceUrl = voiceRecording ? 
      await uploadToCloudinary(voiceRecording) : null;

    // Create grievance with file URLs
    const grievanceData = {
      ...req.body,
      evidenceFiles: evidenceUrls.map((result: any) => result.secure_url),
      voiceRecordingUrl: voiceUrl ? (voiceUrl as any).secure_url : null,
    };

    const grievance = await storage.createGrievance(
      grievanceData,
      req.body.userId,
      req.body.fullName,
      req.body.mobileNumber
    );

    res.status(201).json(grievance);
  } catch (error) {
    console.error('Error creating grievance:', error);
    res.status(500).json({ error: 'Failed to create grievance' });
  }
});

// View grievance details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const grievance = await storage.getGrievance(id);
    
    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }
    
    // Get additional data
    const [verifications, escalationHistory] = await Promise.all([
      storage.getVerificationsByGrievance(id),
      storage.getEscalationHistory(id)
    ]);
    
    res.json({
      ...grievance,
      verifications,
      escalationHistory
    });
  } catch (error) {
    console.error('Error fetching grievance details:', error);
    res.status(500).json({ error: 'Failed to fetch grievance details' });
  }
});

// Verify a grievance (Official endpoint)
router.post('/:id/verify', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const officerId = (req as any).auth?.userId || (req as any).auth?.sub;

    const grievance = await storage.getGrievance(id);
    if (!grievance) {
      return res.status(404).json({ error: 'Grievance not found' });
    }

    // Record the verification on blockchain
    const txHash = await blockchainService.recordVerifiedResolution(
      id,
      grievance.title,
      new Date()
    );

    // Update the grievance in the database
    const updatedGrievance = await storage.verifyGrievance(id, officerId, txHash);
    if (!updatedGrievance) {
      return res.status(500).json({ error: 'Failed to verify grievance' });
    }

    res.json({
      ...updatedGrievance,
      blockchainTxHash: txHash
    });
  } catch (error) {
    console.error('Error verifying grievance:', error);
    res.status(500).json({ error: 'Failed to verify grievance' });
  }
});

export default router;