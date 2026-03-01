require("@nomiclabs/hardhat-ethers");

module.exports = {
    solidity: "0.5.15",
    networks: {
        localhost: {
            url: "http://127.0.0.1:8545",
        },
    },
    paths: {
        sources: "./contracts",
        artifacts: "./artifacts",
    },
};
