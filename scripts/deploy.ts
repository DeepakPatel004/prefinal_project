import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  // Load the compiled contract artifact
  const artifactPath = new URL("../artifacts/contracts/GrievanceSystem.sol/GrievanceSystem.json", import.meta.url);
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  // Create a provider
  const provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);
  const wallet = new ethers.Wallet(process.env.BLOCKCHAIN_PRIVATE_KEY || "", provider);

  console.log("Deploying contracts with the account:", wallet.address);
  console.log("Account balance:", (await provider.getBalance(wallet.address)).toString());

  // Deploy the contract
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const contract = await factory.deploy();

  console.log("Waiting for deployment...");
  await contract.waitForDeployment();

  const deployedAddress = await contract.getAddress();
  console.log("GrievanceSystem deployed to:", deployedAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });