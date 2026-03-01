// Hardhat deployment script for Voting contract
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);

    const Voting = await hre.ethers.getContractFactory("Voting");
    const voting = await Voting.deploy();
    await voting.deployed();

    console.log("Voting contract deployed to:", voting.address);

    // Write contract info in Truffle-compatible format so the frontend (browserify bundle) works
    const artifact = require("../artifacts/contracts/Voting.sol/Voting.json");

    const truffleArtifact = {
        contractName: "Voting",
        abi: artifact.abi,
        networks: {
            // Hardhat's default chainId is 31337
            "31337": {
                address: voting.address,
            },
        },
    };

    const buildDir = path.join(__dirname, "..", "build", "contracts");
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir, { recursive: true });
    }

    fs.writeFileSync(
        path.join(buildDir, "Voting.json"),
        JSON.stringify(truffleArtifact, null, 2)
    );

    console.log("Contract artifact written to build/contracts/Voting.json");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
