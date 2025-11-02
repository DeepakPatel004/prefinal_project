import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";
import TermsFooter from "@/components/ui/terms-footer";
import { useI18n } from '@/lib/i18n';

export default function BlockchainVerification() {
  const [txHash, setTxHash] = useState('');
  const [grievanceId, setGrievanceId] = useState('');
  const CONTRACT_ADDRESS = '0xC63Ceafb18123Dcc0aB5Ca55a74d8c63FeC64199';

  const openEtherscan = (type: 'tx' | 'contract', hash: string) => {
    const baseUrl = 'https://sepolia.etherscan.io';
    const url = type === 'tx' 
      ? `${baseUrl}/tx/${hash}`
      : `${baseUrl}/address/${hash}`;
    window.open(url, '_blank');
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">Blockchain Verification</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Smart Contract</CardTitle>
            <CardDescription>
              View our grievance system smart contract on the Ethereum blockchain (Sepolia testnet)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="bg-muted p-2 rounded text-sm flex-1 overflow-auto">
                {CONTRACT_ADDRESS}
              </code>
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => openEtherscan('contract', CONTRACT_ADDRESS)}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Verify Transaction</CardTitle>
            <CardDescription>
              Enter a transaction hash to verify a grievance on the blockchain
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input 
                placeholder="Enter transaction hash..."
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
              />
              <Button 
                variant="secondary"
                onClick={() => txHash && openEtherscan('tx', txHash)}
              >
                <Search className="h-4 w-4 mr-2" />
                Verify
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Immutable Records</h3>
                  <p className="text-sm text-muted-foreground">
                    When a grievance is submitted or updated, a unique hash of the data is stored on the Ethereum blockchain.
                    This creates a permanent, unchangeable record of the grievance.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Transparent Verification</h3>
                  <p className="text-sm text-muted-foreground">
                    Anyone can verify the authenticity of a grievance by checking its transaction hash
                    on the blockchain. This ensures complete transparency in the grievance system.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1">
                  <AlertCircle className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">How to Verify</h3>
                  <ol className="text-sm text-muted-foreground list-decimal ml-4 space-y-2">
                    <li>Find the transaction hash for your grievance in the grievance details</li>
                    <li>Enter the hash in the verification box above or click the "View on Blockchain" button in your grievance</li>
                    <li>Check the transaction details on Etherscan to verify the data</li>
                  </ol>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <TermsFooter />
    </div>
  );
}