const Web3 = require('web3')
const contract = require('@truffle/contract')

const votingArtifacts = require('../../build/contracts/Voting.json')
var VotingContract = contract(votingArtifacts)

window.App = {
    account: null,

    eventStart: function () {
        // Use account[0] for ALL voters — the smart contract tracks
        // votes by voter_id hash, NOT by msg.sender address
        window.eth.eth.getAccounts()
            .then(function (accounts) {
                if (accounts.length === 0) {
                    console.error("No accounts found. Make sure Hardhat node is running.")
                    return
                }

                // Always use account[0] for transactions
                App.account = accounts[0]

                var voterID = localStorage.getItem('voter_id') || '0'
                console.log("Using account:", App.account, "for voter_id:", voterID)
                $('#accountAddress').html('Your Voting Identifier: ' + (voterID === '0' ? 'System User' : voterID))

                VotingContract.setProvider(window.eth.currentProvider)
                VotingContract.defaults({
                    from: App.account,
                    gas: 6654755,
                })

                VotingContract.deployed()
                    .then(function (instance) {
                        instance.getCountCandidates().then(function (countCandidates) {
                            $(document).ready(function () {
                                $('#addCandidate').click(function () {
                                    var nameCandidate = $('#name').val()
                                    var partyCandidate = $('#party').val()
                                    instance
                                        .addCandidate(nameCandidate, partyCandidate, { from: App.account })
                                        .then(function (result) {
                                            alert("Candidate " + nameCandidate + " added successfully!")
                                            window.location.reload(1)
                                        })
                                        .catch(function (err) {
                                            alert("Failed to add candidate: " + err.message)
                                            console.error(err)
                                        })
                                })
                                $('#addDate').click(function () {
                                    var startDate =
                                        Date.parse(document.getElementById('startDate').value) / 1000

                                    var endDate =
                                        Date.parse(document.getElementById('endDate').value) / 1000

                                    instance.setDates(startDate, endDate, { from: App.account })
                                        .then(function (rslt) {
                                            alert('Dates successfully defined for the election!')
                                            window.location.reload(1)
                                        })
                                        .catch(function (err) {
                                            alert("Failed to set dates: " + err.message)
                                            console.error(err)
                                        })
                                })

                                instance
                                    .getDates()
                                    .then(function (result) {
                                        var startDate = new Date(result[0] * 1000)
                                        var endDate = new Date(result[1] * 1000)

                                        $('#dates').text(
                                            startDate.toDateString('#DD#/#MM#/#YYYY#') +
                                            ' - ' +
                                            endDate.toDateString('#DD#/#MM#/#YYYY#'),
                                        )
                                    })
                                    .catch(function (err) {
                                        console.error('ERROR! ' + err.message)
                                    })
                            })

                            for (var i = 0; i < countCandidates; i++) {
                                instance.getCandidate(i + 1).then(function (data) {
                                    var id = data[0]
                                    var name = data[1]
                                    var party = data[2]
                                    var voteCount = data[3]
                                    var viewCandidates =
                                        '<tr><td> <input class="form-check-input" type="radio" name="candidate" value="' + id + '" id=' + id + '>' +
                                        name +
                                        '</td><td>' +
                                        party +
                                        '</td><td>' +
                                        voteCount +
                                        '</td></tr>'
                                    $('#boxCandidate').append(viewCandidates)
                                })
                            }

                            window.countCandidates = countCandidates
                        })

                        // Check vote status using the voter_id from localStorage
                        var voter_id = localStorage.getItem('voter_id') || ''
                        if (!voter_id) {
                            alert("Voter ID missing. Please log in again.");
                            window.location.replace('/');
                            return;
                        }
                        console.log("Checking vote status for voter_id:", voter_id)
                        instance.checkVote(voter_id).then(function (voted) {
                            console.log("Has this voter_id voted?", voted)
                            if (voted) {
                                $('#voteButton').prop('disabled', true)
                                $('#msg').html('<p>You have already voted.</p>')
                            } else {
                                $('#voteButton').prop('disabled', false)
                                $('#msg').html('')
                            }
                        }).catch(function (err) {
                            console.error("Error checking vote:", err)
                        })
                    })
                    .catch(function (err) {
                        console.error('Contract deployment ERROR: ' + err.message)
                    })
            })
            .catch(function (err) {
                console.error("Failed to fetch accounts:", err)
            })
    },

    vote: function () {
        var candidateID = $("input[name='candidate']:checked").val()
        if (!candidateID) {
            $('#msg').html('<p>Please vote for a candidate.</p>')
            return
        }

        // Disable the button immediately to prevent double-clicks
        $('#voteButton').prop('disabled', true)
        $('#msg').html('<p>Processing your vote...</p>')

        VotingContract.deployed()
            .then(function (instance) {
                var voter_id = localStorage.getItem('voter_id') || ''
                console.log("Voting with voter_id:", voter_id, "from account:", App.account)
                return instance.vote(parseInt(candidateID), voter_id, { from: App.account })
            })
            .then(function (result) {
                $('#msg').html('<p>Voted successfully!</p>')
                alert("Your vote has been securely recorded!")
                window.location.reload(1)
            })
            .catch(function (err) {
                console.error('Vote ERROR: ' + err.message)
                alert("Vote failed: " + err.message)
                // Re-enable button so they can try again
                $('#voteButton').prop('disabled', false)
                $('#msg').html('<p>Vote failed. Please try again.</p>')
            })
    }
}

window.addEventListener('load', function () {
    console.log("Connecting to Hardhat node at http://127.0.0.1:8545")
    window.eth = new Web3(new Web3.providers.HttpProvider('http://127.0.0.1:8545'))
    window.App.eventStart()
})
