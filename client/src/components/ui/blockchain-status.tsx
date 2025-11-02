// src/components/ui/blockchain-status.tsx

import React from 'react';
import { Badge } from './badge';
import { Card, CardContent } from './card';
// Import all necessary icons
import { Eye, Clock, CheckCircle2, CircleDot, XCircle, Loader } from 'lucide-react'; // Added Loader for 'processing'
import { format } from 'date-fns';
import { useI18n } from '@/lib/i18n'; // Assuming this is your i18n setup

interface BlockchainStatusProps {
  txHash?: string;
  verifiedAt?: Date;
  // The 'status' prop will receive a string, which we then interpret.
  // We'll define known states but still allow for any string.
  status?: string; 
}

export function BlockchainStatus({ txHash, verifiedAt, status }: BlockchainStatusProps) {
  const { t } = useI18n(); // For translations

  // If no transaction hash, don't render the component
  if (!txHash) return null;

  let displayStatusText: string;
  let displayStatusColorClass: string;
  let displayStatusIcon: React.ReactNode;

  // Normalize the status string for consistent comparison (e.g., lowercase and trim)
  const normalizedStatus = status?.toLowerCase().trim();

  // --- Frontend-only logic to determine display based on the received 'status' string ---
  switch (normalizedStatus) {
    case 'pending':
      displayStatusText = t('blockchainStatusPending'); // Translated text
      displayStatusColorClass = "bg-amber-600 text-white font-medium"; // Darker amber with bold white text
      displayStatusIcon = <CircleDot className="h-3 w-3 mr-1 text-white" />; // White icon
      break;
    case 'verified':
      displayStatusText = t('blockchainStatusVerified'); // Translated text
      displayStatusColorClass = "bg-emerald-700 text-white font-medium"; // Rich emerald with bold white text
      displayStatusIcon = <CheckCircle2 className="h-3 w-3 mr-1 text-white" />; // White icon
      break;
    case 'error':
      displayStatusText = t('blockchainStatusError'); // Translated text
      displayStatusColorClass = "bg-rose-700 text-white font-medium"; // Deep rose with bold white text
      displayStatusIcon = <XCircle className="h-3 w-3 mr-1 text-white" />; // White icon
      break;
    case 'processing': // Example for an additional status
      displayStatusText = t('blockchainStatusProcessing') || 'Processing...';
      displayStatusColorClass = "bg-blue-500 text-white"; // Use a general Tailwind blue, or define a custom blockchain-processing color
      displayStatusIcon = <Loader className="h-3 w-3 mr-1 animate-spin" />;
      break;
    default:
      // Fallback for any status string that doesn't match known cases, or if status is undefined
      displayStatusText = status ? status.replace(/_/g, ' ').toUpperCase() : t('blockchainStatusUnknown');
      displayStatusColorClass = "bg-gray-500 text-white"; // Default neutral grey
      displayStatusIcon = <Clock className="h-3 w-3 mr-1" />; // Default clock icon
      break;
  }
  // --- End of frontend-only logic ---

  return (
    <Card className="mt-4">
      <CardContent className="pt-4">
        <h4 className="text-sm font-semibold mb-2">{t('blockchainVerificationTitle')}</h4>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`px-3 py-1.5 text-sm ${displayStatusColorClass}`}>
              {displayStatusIcon}
              {displayStatusText}
            </Badge>
          </div>
          {verifiedAt && (
            <div className="text-xs text-muted-foreground">
              {t('verifiedAtLabel')}: {format(new Date(verifiedAt), 'PPp')}
            </div>
          )}
          <div className="text-xs">
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`} // Your blockchain explorer link
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Eye className="h-3 w-3" />
              {t('viewOnBlockchainLink')}
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}