import Web3 from 'web3';
import { Contract } from 'web3-eth-contract';
import type { ContractAbi } from 'web3';
import GrievanceSystemArtifact from '../artifacts/contracts/GrievanceSystem.sol/GrievanceSystem.json';

class BlockchainService {
    private static DEFAULT_SENDER = process.env.BLOCKCHAIN_SENDER_ADDRESS;
    private web3: Web3;
    private contract: Contract<any>;
    
    constructor() {
    // Initialize Web3 with your Ethereum node URL (e.g., Infura)
    // Prefer the BLOCKCHAIN_RPC_URL env var for consistency with other services
    const providerUrl = process.env.BLOCKCHAIN_RPC_URL || process.env.ETHEREUM_NODE_URL || 'http://localhost:8545';
        this.web3 = new Web3(new Web3.providers.HttpProvider(providerUrl));
        
        // Initialize the contract if address is available
    // Prefer BLOCKCHAIN_CONTRACT_ADDRESS for consistency with .env
    const contractAddress = process.env.BLOCKCHAIN_CONTRACT_ADDRESS || process.env.GRIEVANCE_CONTRACT_ADDRESS;
        if (contractAddress) {
            try {
                const contractABI = GrievanceSystemArtifact.abi;
                if (!Array.isArray(contractABI)) {
                    throw new Error('Invalid ABI format');
                }
                this.contract = new this.web3.eth.Contract(
                    contractABI as ContractAbi,
                    contractAddress
                );
            } catch (error) {
                console.error('Failed to initialize contract:', error);
                throw error;
            }
        } else {
            console.warn('Contract address not configured, blockchain features will be disabled');
        }
    }
    
    async submitGrievance(grievanceHash: string, fromAddress: string) {
        if (!this.contract) {
            console.warn('Contract not initialized, skipping blockchain submission');
            return null;
        }
        try {
            const result = await this.contract.methods.submitGrievance(grievanceHash)
                .send({ from: fromAddress });
            return result;
        } catch (error) {
            console.error('Error submitting grievance to blockchain:', error);
            throw error;
        }
    }
    
    async updateGrievanceStatus(grievanceId: number, newStatus: string, officialAddress: string) {
        try {
            const result = await this.contract.methods.updateGrievanceStatus(grievanceId, newStatus)
                .send({ from: officialAddress });
            return result;
        } catch (error) {
            console.error('Error updating grievance status on blockchain:', error);
            throw error;
        }
    }
    
    async getGrievance(grievanceId: number) {
        try {
            const grievance = await this.contract.methods.getGrievance(grievanceId).call();
            return grievance;
        } catch (error) {
            console.error('Error fetching grievance from blockchain:', error);
            throw error;
        }
    }
    
    async resolveGrievance(grievanceId: number, officialAddress: string) {
        try {
            const result = await this.contract.methods.resolveGrievance(grievanceId)
                .send({ from: officialAddress });
            return result;
        } catch (error) {
            console.error('Error resolving grievance on blockchain:', error);
            throw error;
        }
    }
    
    async addOfficial(officialAddress: string, ownerAddress: string) {
        try {
            const result = await this.contract.methods.addOfficial(officialAddress)
                .send({ from: ownerAddress });
            return result;
        } catch (error) {
            console.error('Error adding official to blockchain:', error);
            throw error;
        }
    }
    
    async isOfficial(address: string) {
        try {
            const result = await this.contract.methods.officials(address).call();
            return result;
        } catch (error) {
            console.error('Error checking official status on blockchain:', error);
            throw error;
        }
    }

    async recordVerifiedResolution(grievanceId: string, title: string, timestamp: Date): Promise<string> {
        if (!this.contract) {
            console.warn('Contract not initialized, skipping blockchain verification');
            return 'mock-tx-' + Math.random().toString(36).substring(7);
        }

        try {
            // Get the from address from config or use a default
            const fromAddress = BlockchainService.DEFAULT_SENDER;
            if (!fromAddress) {
                throw new Error('No blockchain sender address configured');
            }

            // Create a grievance hash from the data
            const grievanceHash = this.web3.utils.soliditySha3(
                { t: 'string', v: grievanceId },
                { t: 'string', v: title },
                { t: 'uint256', v: Math.floor(timestamp.getTime() / 1000) }
            );

            if (!grievanceHash) {
                throw new Error('Failed to generate grievance hash');
            }

            // Record verified resolution on chain
            const result = await this.contract.methods.submitGrievance(grievanceHash)
                .send({ from: fromAddress });

            // Return transaction hash
            return result.transactionHash;
        } catch (error) {
            console.error('Error recording verified resolution on blockchain:', error);
            throw error;
        }
    }
}

export const blockchainService = new BlockchainService();