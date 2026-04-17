import { ethers } from 'ethers'
import artifact from '../../../build/contracts/Voting.json'

type NetworkMap = Record<string, { address: string } | undefined>

export type OnChainCandidate = {
  id: number
  name: string
  party: string
  voteCount: number
}

function contractAddress(): string {
  const nets = artifact.networks as NetworkMap
  const addr = nets['31337']?.address
  if (!addr) throw new Error('Voting contract address missing. Run deploy and ensure build/contracts/Voting.json has network 31337.')
  return addr
}

function rpcUrl(): string {
  return import.meta.env.VITE_RPC_URL ?? 'http://127.0.0.1:8545'
}

/** Hardhat #0 — same pattern as the legacy browser bundle against a local node. */
function signerPrivateKey(): string {
  return (
    import.meta.env.VITE_HARDHAT_SIGNER_KEY ??
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
  )
}

export function getReadonlyVotingContract(): ethers.Contract {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl())
  return new ethers.Contract(contractAddress(), artifact.abi, provider)
}

export function getSignerVotingContract(): ethers.Contract {
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl())
  const wallet = new ethers.Wallet(signerPrivateKey(), provider)
  return new ethers.Contract(contractAddress(), artifact.abi, wallet)
}

export async function fetchCandidates(): Promise<OnChainCandidate[]> {
  const c = getReadonlyVotingContract()
  const countBn: ethers.BigNumber = await c.getCountCandidates()
  const count = countBn.toNumber()
  const out: OnChainCandidate[] = []
  for (let i = 1; i <= count; i++) {
    const row: [ethers.BigNumber, string, string, ethers.BigNumber] = await c.getCandidate(i)
    out.push({
      id: row[0].toNumber(),
      name: row[1],
      party: row[2],
      voteCount: row[3].toNumber(),
    })
  }
  return out
}

export async function fetchVotingDates(): Promise<{ start: Date; end: Date } | null> {
  const c = getReadonlyVotingContract()
  const [startSec, endSec]: [ethers.BigNumber, ethers.BigNumber] = await c.getDates()
  if (startSec.isZero() && endSec.isZero()) return null
  return {
    start: new Date(startSec.toNumber() * 1000),
    end: new Date(endSec.toNumber() * 1000),
  }
}

export async function hasVoted(voterId: string): Promise<boolean> {
  const c = getReadonlyVotingContract()
  return Boolean(await c.checkVote(voterId))
}
