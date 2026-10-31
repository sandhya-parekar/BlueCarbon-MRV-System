// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title BlueCarbonMRV
 * @dev Smart contract for tamper-evident registry of Mangrove Aboveground Biomass (AGB),
 * uncertainty intervals, verification priority scores, and verification audit trail.
 *
 * MCA Semester III Research Project:
 * "An Uncertainty-Aware Verification Prioritization Framework for Blockchain-Based Blue Carbon MRV Systems"
 */
contract BlueCarbonMRV {

    enum VerificationStatus {
        Pending,
        Approved,
        Rejected,
        AdditionalMeasurementsRequested
    }

    struct BiomassRecord {
        string plotId;
        uint256 estimatedBiomassKg;      // Biomass in kg (scaled by 100 for 2 decimals: e.g. 12450 = 124.50 kg)
        uint256 lowerUncertaintyKg;     // 95% lower bootstrap bound (*100)
        uint256 upperUncertaintyKg;     // 95% upper bootstrap bound (*100)
        uint256 relativeUncertaintyPct; // Relative uncertainty percentage (*100)
        uint256 priorityScore;          // Percentile-based composite score (*100)
        string priorityLevel;           // "High", "Medium", "Low"
        string evidenceHash;            // SHA-256 hash or IPFS CID of raw tree measurements
        VerificationStatus status;
        string verificationComment;
        address registeredBy;
        address verifiedBy;
        uint256 timestamp;
        uint256 verificationTimestamp;
        bool exists;
    }

    address public owner;
    
    // Mapping of plotId => latest BiomassRecord
    mapping(string => BiomassRecord) public latestRecords;
    
    // Mapping of plotId => array of historical versions
    mapping(string => BiomassRecord[]) public plotHistory;
    
    // List of all registered plot IDs
    string[] public registeredPlotIds;
    mapping(string => bool) private hasPlot;

    // Authorized verification officers
    mapping(address => bool) public authorizedOfficers;

    // Events
    event BiomassRecordRegistered(
        string indexed plotId,
        uint256 estimatedBiomassKg,
        uint256 relativeUncertaintyPct,
        uint256 priorityScore,
        string priorityLevel,
        string evidenceHash,
        address indexed registeredBy,
        uint256 timestamp
    );

    event VerificationStatusUpdated(
        string indexed plotId,
        VerificationStatus status,
        string comment,
        address indexed verifiedBy,
        uint256 timestamp
    );

    event OfficerStatusChanged(address indexed officer, bool authorized);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only contract owner can perform this action");
        _;
    }

    modifier onlyOfficerOrOwner() {
        require(msg.sender == owner || authorizedOfficers[msg.sender], "Not authorized verification officer");
        _;
    }

    constructor() {
        owner = msg.sender;
        authorizedOfficers[msg.sender] = true;
    }

    function setOfficerStatus(address officer, bool authorized) external onlyOwner {
        authorizedOfficers[officer] = authorized;
        emit OfficerStatusChanged(officer, authorized);
    }

    /**
     * @notice Register a new plot biomass estimation and uncertainty evaluation.
     * Large measurement CSVs are NOT stored directly on-chain; only the cryptographic
     * evidence hash is recorded for tamper-evidence.
     */
    function registerBiomassRecord(
        string calldata plotId,
        uint256 estimatedBiomassKg,
        uint256 lowerUncertaintyKg,
        uint256 upperUncertaintyKg,
        uint256 relativeUncertaintyPct,
        uint256 priorityScore,
        string calldata priorityLevel,
        string calldata evidenceHash
    ) external {
        require(bytes(plotId).length > 0, "Invalid plot ID");

        BiomassRecord memory record = BiomassRecord({
            plotId: plotId,
            estimatedBiomassKg: estimatedBiomassKg,
            lowerUncertaintyKg: lowerUncertaintyKg,
            upperUncertaintyKg: upperUncertaintyKg,
            relativeUncertaintyPct: relativeUncertaintyPct,
            priorityScore: priorityScore,
            priorityLevel: priorityLevel,
            evidenceHash: evidenceHash,
            status: VerificationStatus.Pending,
            verificationComment: "",
            registeredBy: msg.sender,
            verifiedBy: address(0),
            timestamp: block.timestamp,
            verificationTimestamp: 0,
            exists: true
        });

        latestRecords[plotId] = record;
        plotHistory[plotId].push(record);

        if (!hasPlot[plotId]) {
            hasPlot[plotId] = true;
            registeredPlotIds.push(plotId);
        }

        emit BiomassRecordRegistered(
            plotId,
            estimatedBiomassKg,
            relativeUncertaintyPct,
            priorityScore,
            priorityLevel,
            evidenceHash,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @notice Update verification status (Approve, Reject, Request Measurements)
     */
    function updateVerificationStatus(
        string calldata plotId,
        VerificationStatus newStatus,
        string calldata comment
    ) external onlyOfficerOrOwner {
        require(latestRecords[plotId].exists, "Plot record does not exist");

        BiomassRecord storage record = latestRecords[plotId];
        record.status = newStatus;
        record.verificationComment = comment;
        record.verifiedBy = msg.sender;
        record.verificationTimestamp = block.timestamp;

        // Also append updated record to history
        plotHistory[plotId].push(record);

        emit VerificationStatusUpdated(
            plotId,
            newStatus,
            comment,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @notice Get latest record for a plot
     */
    function getLatestRecord(string calldata plotId) external view returns (BiomassRecord memory) {
        require(latestRecords[plotId].exists, "Plot record does not exist");
        return latestRecords[plotId];
    }

    /**
     * @notice Get complete audit trail / history for a plot
     */
    function getPlotHistory(string calldata plotId) external view returns (BiomassRecord[] memory) {
        return plotHistory[plotId];
    }

    /**
     * @notice Total registered plots count
     */
    function getPlotsCount() external view returns (uint256) {
        return registeredPlotIds.length;
    }

    /**
     * @notice Get all registered plot IDs
     */
    function getAllPlotIds() external view returns (string[] memory) {
        return registeredPlotIds;
    }
}
