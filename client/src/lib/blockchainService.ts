import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

// We'll need to import the ABI after compiling the contract
const GRIEVANCE_CONTRACT_ADDRESS = process.env.VITE_GRIEVANCE_CONTRACT_ADDRESS;

class BlockchainService {
  private web3: Web3 | null = null;
  private contract: any = null;

  async initialize() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        this.web3 = new Web3(window.ethereum);
        
        // Set up contract instance here after importing ABI
        // this.contract = new this.web3.eth.Contract(GrievanceSystemABI as AbiItem[], GRIEVANCE_CONTRACT_ADDRESS);
        
        return true;
      } catch (error) {
        console.error('User denied account access');
        return false;
      }
    } else {
      console.log('Please install MetaMask!');
      return false;
    }
  }

  async getCurrentAccount(): Promise<string | null> {
    if (!this.web3) {
      return null;
    }

    try {
      const accounts = await this.web3.eth.getAccounts();
      return accounts[0];
    } catch (error) {
      console.error('Error getting current account:', error);
      return null;
    }
  }

  async submitGrievance(grievanceHash: string): Promise<boolean> {
    if (!this.web3 || !this.contract) {
      console.error('Web3 or contract not initialized');
      return false;
    }

    try {
      const account = await this.getCurrentAccount();
      if (!account) {
        throw new Error('No account available');
      }

      await this.contract.methods.submitGrievance(grievanceHash)
        .send({ from: account });
      return true;
    } catch (error) {
      console.error('Error submitting grievance to blockchain:', error);
      return false;
    }
  }

  // Add more methods for other blockchain interactions as needed
}

export const blockchainService = new BlockchainService();