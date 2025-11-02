import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import path from 'path';
import os from 'os';
import { writeFile } from 'fs/promises';
import FormData from 'form-data';

interface TranscriptionResponse {
  text: string;
}

export async function transcribeAudio(audioBuffer: Buffer, fileName: string): Promise<string> {
  try {
    // Save buffer to temporary file
    const tempPath = path.join(os.tmpdir(), fileName);
    await writeFile(tempPath, audioBuffer);

    // Create form data using form-data package
    const formData = new FormData();
    formData.append('file', audioBuffer, {
      filename: fileName,
      contentType: 'audio/wav', // Adjust based on actual audio format
    });
    formData.append('model', process.env.OPENAI_MODEL || 'whisper-1');
    formData.append('language', 'en'); // You can make this dynamic based on user preference

    // Make API call to OpenAI
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders()
      },
      body: formData as any,
    });

    // Clean up temp file
    await unlink(tempPath).catch(console.error);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Transcription failed: ${error}`);
    }

    const result: TranscriptionResponse = await response.json();
    return result.text;
  } catch (error) {
    console.error('Transcription error:', error);
    throw new Error('Failed to transcribe audio');
  }
}