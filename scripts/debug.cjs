const hre = require("hardhat");

async function main() {
  console.log("HRE keys:", Object.keys(hre));
  if (hre.viem) {
    console.log("Viem is present");
  } else {
    console.log("Viem is MISSING");
  }
}

main().catch(console.error);