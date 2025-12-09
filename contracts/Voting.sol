pragma solidity ^0.5.15;

contract Voting {
    struct Candidate {
        uint256 id;
        string name;
        string party;
        uint256 voteCount;
    }

    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool) public voters;

    uint256 public countCandidates;
    uint256 public votingEnd;
    uint256 public votingStart;

    function addCandidate(string memory name, string memory party)
        public
        returns (uint256)
    {
        countCandidates++;
        candidates[countCandidates] = Candidate(countCandidates, name, party, 0);
        return countCandidates;
    }

    function vote(uint256 candidateID) public {
        require((votingStart <= now) && (votingEnd > now));

        require(candidateID > 0 && candidateID <= countCandidates);

        require(!voters[msg.sender]);

        voters[msg.sender] = true;

        candidates[candidateID].voteCount++;
    }

    function checkVote() public view returns (bool) {
        return voters[msg.sender];
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
