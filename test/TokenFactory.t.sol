// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Test} from "forge-std/Test.sol";
import {Token} from "../src/Token.sol";
import {TokenFactory} from "../src/TokenFactory.sol";

contract TokenFactoryTest is Test {
    TokenFactory private factory;
    address private creator = address(0xA11CE);
    address private recipient = address(0xB0B);
    address private spender = address(0xCAFE);

    event TokenCreated(address indexed creator, address indexed tokenAddress, string name, string symbol, string iconUrl);

    function setUp() public {
        factory = new TokenFactory();
    }

    function test_CreateTokenMintsInitialSupplyToCreator() public {
        vm.prank(creator);
        address tokenAddress = factory.createToken("My Token", "MTK", 1_000_000, 6, "");

        Token token = Token(tokenAddress);

        assertEq(token.name(), "My Token");
        assertEq(token.symbol(), "MTK");
        assertEq(token.decimals(), 6);
        assertEq(token.owner(), creator);
        assertEq(token.totalSupply(), 1_000_000 * 10 ** 6);
        assertEq(token.balanceOf(creator), 1_000_000 * 10 ** 6);
    }

    function test_CreateTokenTracksFactoryAndCreatorTokens() public {
        vm.prank(creator);
        address tokenAddress = factory.createToken("Launch Token", "LCH", 500, 2, "");

        address[] memory allTokens = factory.getDeployedTokens();
        address[] memory creatorTokens = factory.getTokensByCreator(creator);

        assertEq(allTokens.length, 1);
        assertEq(allTokens[0], tokenAddress);
        assertEq(creatorTokens.length, 1);
        assertEq(creatorTokens[0], tokenAddress);
    }

    function test_TokenTransfersAndAllowances() public {
        vm.prank(creator);
        Token token = Token(factory.createToken("Spend Token", "SPND", 100, 6, ""));

        vm.prank(creator);
        assertTrue(token.transfer(recipient, 25 * 10 ** 6));

        assertEq(token.balanceOf(recipient), 25 * 10 ** 6);

        vm.prank(recipient);
        assertTrue(token.approve(spender, 10 * 10 ** 6));

        vm.prank(spender);
        assertTrue(token.transferFrom(recipient, creator, 4 * 10 ** 6));

        assertEq(token.balanceOf(recipient), 21 * 10 ** 6);
        assertEq(token.allowance(recipient, spender), 6 * 10 ** 6);
    }

    function test_RevertsForInvalidTokenDetails() public {
        vm.expectRevert("Invalid name length");
        factory.createToken("No", "NO", 1, 6, "");

        vm.expectRevert("Invalid symbol length");
        factory.createToken("Valid Name", "N", 1, 6, "");

        vm.expectRevert("Supply must be positive");
        factory.createToken("Valid Name", "VAL", 0, 6, "");

        vm.expectRevert("Decimals too high");
        factory.createToken("Valid Name", "VAL", 1, 19, "");
    }
}
