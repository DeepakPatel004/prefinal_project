import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { AudioPlayer } from "@/components/ui/audio-player";
import { ChevronLeft, ChevronRight, Download, ExternalLink, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EvidenceViewerProps {
  images?: string[];
  audioUrl?: string | null;
  audioTranscript?: string | null;
  onClose?: () => void;
  className?: string;
}

export function EvidenceViewer({ images = [], audioUrl, audioTranscript, onClose, className }: EvidenceViewerProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const nextImage = () => {
    setSelectedImageIndex((prev) => (prev + 1) % images.length);
  };

  const previousImage = () => {
    setSelectedImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const downloadImage = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = url.split('/').pop() || 'evidence';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const openInNewTab = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Image Gallery */}
      {images.length > 0 && (
        <div>
          <h3 className="font-semibold mb-4">Evidence Photos ({images.length})</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            {images.map((url, index) => (
              <div
                key={url}
                className="aspect-square relative group cursor-pointer rounded-lg overflow-hidden border"
                onClick={() => {
                  setSelectedImageIndex(index);
                  setIsLightboxOpen(true);
                }}
              >
                <img
                  src={url}
                  alt={`Evidence ${index + 1}`}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-white" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Audio Evidence */}
      {audioUrl && (
        <div>
          <h3 className="font-semibold mb-4">Voice Recording</h3>
          <AudioPlayer src={audioUrl} transcript={audioTranscript} />
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
          <div className="flex-grow relative flex items-center justify-center bg-black/95 p-4">
            <img
              src={images[selectedImageIndex]}
              alt={`Evidence ${selectedImageIndex + 1}`}
              className="max-h-full max-w-full object-contain"
            />
            
            {/* Navigation arrows */}
            {images.length > 1 && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute left-4 h-12 w-12 rounded-full bg-black/50 hover:bg-black/70"
                  onClick={(e) => {
                    e.stopPropagation();
                    previousImage();
                  }}
                >
                  <ChevronLeft className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-4 h-12 w-12 rounded-full bg-black/50 hover:bg-black/70"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                >
                  <ChevronRight className="h-8 w-8" />
                </Button>
              </>
            )}
          </div>

          {/* Image actions */}
          <div className="p-4 flex justify-between items-center border-t bg-card">
            <span className="text-sm text-muted-foreground">
              {selectedImageIndex + 1} of {images.length}
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => downloadImage(images[selectedImageIndex])}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openInNewTab(images[selectedImageIndex])}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}