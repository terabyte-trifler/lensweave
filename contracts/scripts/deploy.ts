import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  const Factory = await ethers.getContractFactory("LensWeaveCollective");
  const c = await Factory.deploy(deployer.address);
  await c.waitForDeployment();

  const addr = await c.getAddress();
  console.log("LensWeaveCollective deployed at:", addr);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
