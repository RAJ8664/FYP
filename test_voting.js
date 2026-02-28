// Direct contract test: proves whether 2 different voter_ids can vote
const Web3 = require('web3')
const contract = require('@truffle/contract')
const votingArtifacts = require('./build/contracts/Voting.json')

const web3 = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))
const VotingContract = contract(votingArtifacts)
VotingContract.setProvider(web3.currentProvider)

async function test() {
    const accounts = await web3.eth.getAccounts()
    console.log("Available accounts:", accounts.length)
    console.log("Account 0:", accounts[0])

    const instance = await VotingContract.deployed()
    console.log("Contract address:", instance.address)

    // Check current voting dates
    const dates = await instance.getDates()
    console.log("\nVoting Start:", dates[0].toString())
    console.log("Voting End:", dates[1].toString())
    console.log("Current block time (approx):", Math.floor(Date.now() / 1000))

    // Check candidate count
    const count = await instance.getCountCandidates()
    console.log("\nCandidate count:", count.toString())

    // If no candidates or dates, set them up
    if (count.toString() === '0') {
        console.log("\n--- Setting up: adding candidate ---")
        await instance.addCandidate("TestCandidate", "TestParty", { from: accounts[0] })
        console.log("Candidate added!")
    }

    if (dates[1].toString() === '0') {
        console.log("\n--- Setting up: setting dates ---")
        const now = Math.floor(Date.now() / 1000)
        const start = now - 60  // started 1 minute ago
        const end = now + 86400 // ends in 24 hours
        await instance.setDates(start, end, { from: accounts[0] })
        console.log("Dates set! Start:", start, "End:", end)
    }

    // Test 1: Vote with voter_id "user1" using account[0]
    console.log("\n=== TEST: Voting with voter_id 'user1' from account[0] ===")
    const check1Before = await instance.checkVote("user1")
    console.log("checkVote('user1') BEFORE voting:", check1Before)

    if (!check1Before) {
        try {
            await instance.vote(1, "user1", { from: accounts[0] })
            console.log("SUCCESS: user1 voted from account[0]!")
        } catch (e) {
            console.log("FAILED: user1 vote error:", e.message)
        }
    } else {
        console.log("user1 already voted, skipping...")
    }

    // Test 2: Vote with "user2" FROM THE SAME account[0]
    console.log("\n=== TEST: Voting with voter_id 'user2' from SAME account[0] ===")
    const check2Before = await instance.checkVote("user2")
    console.log("checkVote('user2') BEFORE voting:", check2Before)

    if (!check2Before) {
        try {
            await instance.vote(1, "user2", { from: accounts[0] })
            console.log("SUCCESS: user2 voted from account[0]!")
        } catch (e) {
            console.log("FAILED: user2 vote error:", e.message)
        }
    } else {
        console.log("user2 already voted, skipping...")
    }

    // Final status
    const check1After = await instance.checkVote("user1")
    const check2After = await instance.checkVote("user2")
    console.log("\n=== FINAL STATUS ===")
    console.log("checkVote('user1'):", check1After)
    console.log("checkVote('user2'):", check2After)

    const candidateData = await instance.getCandidate(1)
    console.log("Candidate 1 vote count:", candidateData[3].toString())
}

test().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
