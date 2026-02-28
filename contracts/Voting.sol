pragma solidity ^0.5.15;

contract Voting {
    struct Candidate {
        uint256 id;
        string name;
        string party;
        uint256 voteCount;
    }

    mapping(uint256 => Candidate) public candidates;
    mapping(bytes32 => bool) public candidateExists;
    mapping(bytes32 => bool) public voterHasVoted; // track caller by their voter_id hash

    uint256 public countCandidates;
    uint256 public votingEnd;
    uint256 public votingStart;

    function addCandidate(string memory name, string memory party)
        public
        returns (uint256)
    {
        bytes32 candidateHash = keccak256(abi.encodePacked(name, party));
        require(!candidateExists[candidateHash], "Candidate already exists");

        countCandidates++;
        candidates[countCandidates] = Candidate(countCandidates, name, party, 0);
        candidateExists[candidateHash] = true;

        return countCandidates;
    }

    function vote(uint256 candidateID, string memory voter_id) public {
        require((votingStart <= now) && (votingEnd > now), "Voting is not active");

        require(candidateID > 0 && candidateID <= countCandidates, "Invalid candidate");

        // Hash the voter_id
        bytes32 voterHash = keccak256(abi.encodePacked(voter_id));

        // Ensure the voter_id hasn't already voted
        require(!voterHasVoted[voterHash], "User has already voted");

        voterHasVoted[voterHash] = true;

        candidates[candidateID].voteCount++;
    }

    function checkVote(string memory voter_id) public view returns (bool) {
        bytes32 voterHash = keccak256(abi.encodePacked(voter_id));
        return voterHasVoted[voterHash];
    }

    function getCountCandidates() public view returns (uint256) {
        return countCandidates;
    }

    function getCandidate(uint256 candidateID)
        public
        view
        returns (uint256, string memory, string memory, uint256)
    {
        return (
            candidateID,
            candidates[candidateID].name,
            candidates[candidateID].party,
            candidates[candidateID].voteCount
        );
    }

    function setDates(uint256 _startDate, uint256 _endDate) public {
        require(
            (votingEnd == 0) && (votingStart == 0)
                && (_startDate + 1000000 > now) && (_endDate > _startDate)
        );
        votingEnd = _endDate;
        votingStart = _startDate;
    }

    function getDates() public view returns (uint256, uint256) {
        return (votingStart, votingEnd);
    }
}
