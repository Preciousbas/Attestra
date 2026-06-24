// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title SignalRegistry
/// @author Attestra
/// @notice Immutable on-chain anchor for verifiable AI trading signals.
/// @dev Content hash must be keccak256 of the canonical JSON payload stored on 0G Storage.
contract SignalRegistry {
    struct Signal {
        bytes32 contentHash;
        string storageUri;
        string symbol;
        address submitter;
        uint256 timestamp;
    }

    uint256 private _nextSignalId = 1;
    mapping(uint256 => Signal) private _signals;
    mapping(bytes32 => uint256) public hashToSignalId;

    event SignalRegistered(
        uint256 indexed signalId,
        bytes32 indexed contentHash,
        string storageUri,
        string symbol,
        address indexed submitter,
        uint256 timestamp
    );

    /// @notice Anchor a new signal by content hash and storage URI.
    /// @param contentHash keccak256 of the canonical signal JSON (must be non-zero).
    /// @param storageUri 0G Storage locator (e.g. `0g-storage://0x{rootHash}`).
    /// @param symbol Trading pair symbol (e.g. `BTCUSDT`).
    /// @return signalId Monotonic ID starting at 1.
    function registerSignal(bytes32 contentHash, string calldata storageUri, string calldata symbol)
        external
        returns (uint256 signalId)
    {
        require(contentHash != bytes32(0), "empty hash");
        require(hashToSignalId[contentHash] == 0, "hash exists");

        signalId = _nextSignalId++;
        _signals[signalId] = Signal({
            contentHash: contentHash,
            storageUri: storageUri,
            symbol: symbol,
            submitter: msg.sender,
            timestamp: block.timestamp
        });
        hashToSignalId[contentHash] = signalId;

        emit SignalRegistered(
            signalId, contentHash, storageUri, symbol, msg.sender, block.timestamp
        );
    }

    /// @notice Fetch a registered signal by ID.
    /// @dev Reverts with `"not found"` for unknown or zero IDs.
    function getSignal(uint256 signalId)
        external
        view
        returns (
            bytes32 contentHash,
            string memory storageUri,
            string memory symbol,
            address submitter,
            uint256 timestamp
        )
    {
        Signal memory record = _signals[signalId];
        require(record.timestamp != 0, "not found");
        return
            (
                record.contentHash,
                record.storageUri,
                record.symbol,
                record.submitter,
                record.timestamp
            );
    }

    /// @notice Total number of signals ever registered.
    function signalCount() external view returns (uint256) {
        return _nextSignalId - 1;
    }
}
