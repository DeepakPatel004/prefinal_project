import { Router } from 'express';
import { upload } from '../middleware/upload';
import { uploadToCloudinary } from '../cloudinary';

const router = Router();

// Test upload endpoint
router.post('/test-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const result = await uploadToCloudinary(req.file);
    res.json({ 
      success: true, 
      url: (result as any).secure_url,
      message: "File uploaded successfully"
    });
  } catch (error) {
    console.error('Upload test error:', error);
    res.status(500).json({ 
      error: "Upload failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});