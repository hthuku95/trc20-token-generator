// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Token} from "./Token.sol";

contract TokenFactory {
    address[] private deployedTokens;
    mapping(address => address[]) private tokensByCreator;

    event TokenCreated(address indexed creator, address indexed tokenAddress, string name, string symbol, string iconUrl);

    function createToken(
        string calldata name,
        string calldata symbol,
        uint256 supply,
        uint8 decimals,
        string calldata iconUrl
    ) external returns (address tokenAddress) {
        Token token = new Token(name, symbol, supply, decimals, msg.sender, iconUrl);
        tokenAddress = address(token);

        deployedTokens.push(tokenAddress);
        tokensByCreator[msg.sender].push(tokenAddress);

        emit TokenCreated(msg.sender, tokenAddress, name, symbol, iconUrl);
    }

    function createTokenVanity(
        string calldata name,
        string calldata symbol,
        uint256 supply,
        uint8 decimals,
        string calldata iconUrl,
        bytes32 salt
    ) external returns (address tokenAddress) {
        Token token = new Token{salt: salt}(name, symbol, supply, decimals, msg.sender, iconUrl);
        tokenAddress = address(token);

        deployedTokens.push(tokenAddress);
        tokensByCreator[msg.sender].push(tokenAddress);

        emit TokenCreated(msg.sender, tokenAddress, name, symbol, iconUrl);
    }

    function predictTokenAddress(
        string calldata name,
        string calldata symbol,
        uint256 supply,
        uint8 decimals,
        string calldata iconUrl,
        address owner,
        bytes32 salt
    ) external view returns (address) {
        bytes memory initCode = abi.encodePacked(
            type(Token).creationCode,
            abi.encode(name, symbol, supply, decimals, owner, iconUrl)
        );
        bytes32 hash = keccak256(
            abi.encodePacked(bytes1(0x41), address(this), salt, keccak256(initCode))
        );
        return address(uint160(uint256(hash)));
    }

    function getInitCodeHash(
        string calldata name,
        string calldata symbol,
        uint256 supply,
        uint8 decimals,
        string calldata iconUrl,
        address owner
    ) external pure returns (bytes32) {
        bytes memory initCode = abi.encodePacked(
            type(Token).creationCode,
            abi.encode(name, symbol, supply, decimals, owner, iconUrl)
        );
        return keccak256(initCode);
    }

    function getDeployedTokens() external view returns (address[] memory) {
        return deployedTokens;
    }

    function getTokensByCreator(address creator) external view returns (address[] memory) {
        return tokensByCreator[creator];
    }
}
