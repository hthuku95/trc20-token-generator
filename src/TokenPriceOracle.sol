// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

contract TokenPriceOracle {
    address public oracleAddress;
    uint256 public tokenValue;

    event ValueUpdated(uint256 newValue, uint256 timestamp);

    constructor(address _oracleAddress) {
        require(_oracleAddress != address(0), "Invalid oracle address");
        oracleAddress = _oracleAddress;
    }

    modifier onlyOracle() {
        require(msg.sender == oracleAddress, "Caller is not oracle");
        _;
    }

    function setTokenValue(uint256 _newValue) external onlyOracle {
        tokenValue = _newValue;
        emit ValueUpdated(_newValue, block.timestamp);
    }
}
