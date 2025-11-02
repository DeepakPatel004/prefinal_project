// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract GrievanceSystem is Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _grievanceIds;

    struct Grievance {
        uint256 id;
        address submitter;
        string grievanceHash;  // IPFS hash of grievance details
        string status;
        uint256 timestamp;
        address assignedTo;
        bool resolved;
    }

    mapping(uint256 => Grievance) public grievances;
    mapping(address => bool) public officials;

    event GrievanceSubmitted(uint256 indexed id, address indexed submitter, string grievanceHash);
    event GrievanceStatusUpdated(uint256 indexed id, string status);
    event GrievanceResolved(uint256 indexed id);
    event OfficialAdded(address indexed official);
    event OfficialRemoved(address indexed official);

    modifier onlyOfficial() {
        require(officials[msg.sender], "Not authorized as an official");
        _;
    }

    constructor() {
        officials[msg.sender] = true;
        emit OfficialAdded(msg.sender);
    }

    function addOfficial(address official) external onlyOwner {
        officials[official] = true;
        emit OfficialAdded(official);
    }

    function removeOfficial(address official) external onlyOwner {
        officials[official] = false;
        emit OfficialRemoved(official);
    }

    function submitGrievance(string memory grievanceHash) external returns (uint256) {
        _grievanceIds.increment();
        uint256 grievanceId = _grievanceIds.current();

        grievances[grievanceId] = Grievance({
            id: grievanceId,
            submitter: msg.sender,
            grievanceHash: grievanceHash,
            status: "Pending",
            timestamp: block.timestamp,
            assignedTo: address(0),
            resolved: false
        });

        emit GrievanceSubmitted(grievanceId, msg.sender, grievanceHash);
        return grievanceId;
    }

    function updateGrievanceStatus(uint256 grievanceId, string memory newStatus) external onlyOfficial {
        require(grievances[grievanceId].id != 0, "Grievance does not exist");
        grievances[grievanceId].status = newStatus;
        emit GrievanceStatusUpdated(grievanceId, newStatus);
    }

    function assignGrievance(uint256 grievanceId, address official) external onlyOfficial {
        require(grievances[grievanceId].id != 0, "Grievance does not exist");
        require(officials[official], "Invalid official address");
        grievances[grievanceId].assignedTo = official;
    }

    function resolveGrievance(uint256 grievanceId) external onlyOfficial {
        require(grievances[grievanceId].id != 0, "Grievance does not exist");
        require(!grievances[grievanceId].resolved, "Grievance already resolved");
        
        grievances[grievanceId].resolved = true;
        grievances[grievanceId].status = "Resolved";
        emit GrievanceResolved(grievanceId);
    }

    function getGrievance(uint256 grievanceId) external view returns (
        uint256 id,
        address submitter,
        string memory grievanceHash,
        string memory status,
        uint256 timestamp,
        address assignedTo,
        bool resolved
    ) {
        Grievance memory grievance = grievances[grievanceId];
        require(grievance.id != 0, "Grievance does not exist");
        return (
            grievance.id,
            grievance.submitter,
            grievance.grievanceHash,
            grievance.status,
            grievance.timestamp,
            grievance.assignedTo,
            grievance.resolved
        );
    }
}