import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

// 1. LOAD ENVIRONMENT VARIABLES
const {
  BLOCKCHAIN_RPC_URL,
  BLOCKCHAIN_CONTRACT_ADDRESS,
  BLOCKCHAIN_PRIVATE_KEY,
} = process.env as Record<string, string | undefined>;

if (!BLOCKCHAIN_RPC_URL || !BLOCKCHAIN_CONTRACT_ADDRESS || !BLOCKCHAIN_PRIVATE_KEY) {
  console.error('FATAL ERROR: Missing blockchain environment variables. Ensure BLOCKCHAIN_RPC_URL, BLOCKCHAIN_CONTRACT_ADDRESS and BLOCKCHAIN_PRIVATE_KEY are set.');
  // Do not exit the process here; allow the server to run (useful for dev without blockchain).
}

// 2. LOAD CONTRACT ABI
let contractABI: any[] = [];
try {
  const abiPath = path.resolve(process.cwd(), 'artifacts/contracts/GrievanceSystem.sol/GrievanceSystem.json');
  if (fs.existsSync(abiPath)) {
    const abiFile = fs.readFileSync(abiPath, 'utf-8');
    const parsed = JSON.parse(abiFile);
    contractABI = parsed.abi || parsed.default?.abi || [];
  } else {
    console.warn('Contract ABI not found at', abiPath, "— blockchain calls will be disabled until you compile and provide the ABI.");
  }
} catch (error) {
  console.error('FATAL ERROR: Could not load contract ABI.', error);
}

// 3. INITIALIZE ETHERS
// Use Ethers v6 types (JsonRpcProvider is exported directly from ethers)
let provider: ethers.JsonRpcProvider | undefined;
let wallet: ethers.Wallet | undefined;
let contract: ethers.Contract | undefined;

try {
  if (BLOCKCHAIN_RPC_URL) provider = new ethers.JsonRpcProvider(BLOCKCHAIN_RPC_URL);
  if (provider && BLOCKCHAIN_PRIVATE_KEY) wallet = new ethers.Wallet(BLOCKCHAIN_PRIVATE_KEY, provider);
  if (wallet && contractABI.length > 0 && BLOCKCHAIN_CONTRACT_ADDRESS) {
    contract = new ethers.Contract(BLOCKCHAIN_CONTRACT_ADDRESS, contractABI, wallet);
  }
} catch (err) {
  console.error('Error initializing ethers provider/wallet/contract:', err);
}

if (contract) {
  console.log('Blockchain service initialized. Ready to send transactions.');
} else {
  console.log('Blockchain service not fully initialized (ABI, provider or contract missing). On-chain calls will be skipped.');
  // give more detailed diagnostics to help debugging
  try {
    console.log('BLOCKCHAIN_RPC_URL set:', Boolean(BLOCKCHAIN_RPC_URL));
    console.log('BLOCKCHAIN_CONTRACT_ADDRESS set:', Boolean(BLOCKCHAIN_CONTRACT_ADDRESS));
    console.log('BLOCKCHAIN_PRIVATE_KEY set:', Boolean(BLOCKCHAIN_PRIVATE_KEY));
    console.log('ABI loaded:', contractABI.length > 0);
    console.log('Provider created:', Boolean(provider));
    console.log('Wallet created:', Boolean(wallet));
  } catch (e) {
    /* ignore diagnostic errors */
  }
}

/**
 * Calls the smart contract to record a verified grievance.
 * @param grievanceId string - the internal grievance id (UUID)
 * @param title string - grievance title
 * @param verifiedAt Date
 * @returns Promise<string> transaction hash
 */
export const recordVerifiedResolution = async (grievanceId: string, title: string, verifiedAt: Date): Promise<string> => {
  if (!contract) {
    throw new Error('Blockchain contract not initialized');
  }

  try {
    // For this contract the public entrypoint is `submitGrievance(string grievanceHash)`
    // We will submit the internal grievance id (UUID) as the grievanceHash so the
    // contract stores an immutable on-chain record. The contract will emit
    // GrievanceSubmitted and return a numeric grievance id.
    console.log(`Submitting grievance to blockchain (as grievanceHash): ${grievanceId}`);

    const tx = await contract.submitGrievance(String(grievanceId));
    // Wait for transaction to be mined (1 confirmation)
    await tx.wait(1);

    console.log(`Transaction successful! Hash: ${tx.hash}`);
    return tx.hash;
  } catch (err: any) {
    console.error('Blockchain transaction failed:', err?.message || err);
    throw err;
  }
};

export default {
  recordVerifiedResolution,
};
