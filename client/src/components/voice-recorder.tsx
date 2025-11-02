import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { AudioPlayer } from "@/components/ui/audio-player";
import { getToken } from "@/lib/authService";

type Props = {
  grievanceId: string;
  existingUrl?: string | null;
};

export default function VoiceRecorder({ grievanceId, existingUrl }: Props) {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingUrl || null);
  const [blobData, setBlobData] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);

  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (audioUrl && audioUrl.startsWith("blob:")) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const start = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Your browser does not support audio recording.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setBlobData(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };
      mr.start();
      setMediaRecorder(mr);
      setRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
      alert("Unable to access microphone");
    }
  };

  const stop = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
    setRecording(false);
  };

  const upload = async () => {
    if (!blobData) return;
    setUploading(true);
    try {
      const form = new FormData();
      // name the file so server/uploader can detect type
      form.append("audio", blobData, `grievance-${grievanceId}.webm`);

      const token = getToken();
      const res = await fetch(`/api/grievances/${grievanceId}/evidence/audio`, {
        method: "POST",
        body: form,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || res.statusText);
      }

      const data = await res.json();
      if (data.voiceRecordingUrl) setAudioUrl(data.voiceRecordingUrl);
      if (data.voiceTranscription) setTranscript(data.voiceTranscription);
      // clear blob (we now rely on uploaded URL)
      setBlobData(null);
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed: " + (err as any).message || "");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {!recording ? (
          <Button size="sm" onClick={start}>Start Recording</Button>
        ) : (
          <Button size="sm" variant="destructive" onClick={stop}>Stop</Button>
        )}
        {blobData && (
          <Button size="sm" onClick={upload} disabled={uploading}>{uploading ? "Uploading..." : "Upload"}</Button>
        )}
      </div>

      {audioUrl ? (
        <div className="space-y-2">
          <AudioPlayer src={audioUrl} transcript={transcript} />
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">No recording available.</div>
      )}
    </div>
  );
}
