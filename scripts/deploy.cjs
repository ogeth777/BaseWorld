const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying contract with account:", deployer.address);

  const Paint = await hre.ethers.getContractFactory("BaseEarthPaint");
  const paint = await Paint.deploy();

  console.log("Deployment transaction hash:", paint.deploymentTransaction().hash);

  await paint.waitForDeployment();

  console.log(`BaseEarthPaint deployed to ${await paint.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});