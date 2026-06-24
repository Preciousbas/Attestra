// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {AgenticID} from "../../contracts/agentic/AgenticID.sol";
import {IERC7857} from "../../contracts/agentic/interfaces/IERC7857.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {
    IERC721Enumerable
} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";

/// @title AgenticIDTest
/// @notice Unit tests for ERC-7857 Agentic ID (excludes deploy scripts).
contract AgenticIDTest is Test {
    AgenticID internal agentic;
    AgenticID internal feeAgentic;

    address internal minter = makeAddr("minter");
    address internal operator = makeAddr("operator");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");
    address internal stranger = makeAddr("stranger");

    bytes32 internal constant HASH = keccak256("signal-payload");
    uint256 internal constant MINT_FEE = 0.01 ether;

    event MintFeeUpdated(uint256 oldFee, uint256 newFee);
    event DelegateAccessSet(address indexed owner, address indexed assistant);
    event SignalLinked(uint256 indexed tokenId, uint256 indexed signalId);
    event IntelligentDataSet(uint256 indexed tokenId, IERC7857.IntelligentData[] data);
    event IntelligentTransfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event IntelligentClone(
        address indexed from, address indexed to, uint256 indexed sourceTokenId, uint256 newTokenId
    );
    event UsageAuthorized(uint256 indexed tokenId, address indexed user);
    event UsageRevoked(uint256 indexed tokenId, address indexed user);

    function setUp() public {
        agentic = new AgenticID("Attestra Signal Agent", "ATSIG", 0);
        agentic.grantRole(agentic.MINTER_ROLE(), minter);
        agentic.grantRole(agentic.OPERATOR_ROLE(), operator);

        feeAgentic = new AgenticID("Fee Agent", "FEE", MINT_FEE);
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(carol, 10 ether);
    }

    function _singleData() internal pure returns (IERC7857.IntelligentData[] memory datas) {
        datas = new IERC7857.IntelligentData[](1);
        datas[0] = IERC7857.IntelligentData({dataDescription: "Attestra signal #1", dataHash: HASH});
    }

    function _dualData() internal pure returns (IERC7857.IntelligentData[] memory datas) {
        datas = new IERC7857.IntelligentData[](2);
        datas[0] = IERC7857.IntelligentData({dataDescription: "part-a", dataHash: HASH});
        datas[1] =
            IERC7857.IntelligentData({dataDescription: "part-b", dataHash: keccak256("part-b")});
    }

    function _mintToAlice() internal returns (uint256 tokenId) {
        vm.prank(minter);
        tokenId = agentic.iMintWithRole(alice, _singleData(), alice);
    }

    // --- Constructor & config ---

    function test_Constructor_GrantsRolesAndSetsFee() public view {
        assertEq(agentic.mintFee(), 0);
        assertEq(agentic.creator(), address(this));
        assertTrue(agentic.hasRole(agentic.DEFAULT_ADMIN_ROLE(), address(this)));
        assertTrue(agentic.hasRole(agentic.MINTER_ROLE(), address(this)));
        assertTrue(agentic.hasRole(agentic.OPERATOR_ROLE(), address(this)));
        assertEq(feeAgentic.mintFee(), MINT_FEE);
    }

    function test_SetMintFee_EmitsAndUpdates() public {
        vm.expectEmit(true, true, true, true);
        emit MintFeeUpdated(0, MINT_FEE);
        agentic.setMintFee(MINT_FEE);
        assertEq(agentic.mintFee(), MINT_FEE);
    }

    function test_SetMintFee_RevertsForNonAdmin() public {
        vm.prank(stranger);
        vm.expectRevert();
        agentic.setMintFee(1);
    }

    function test_Withdraw_SendsBalanceToAdmin() public {
        vm.startPrank(alice);
        AgenticID owned = new AgenticID("Owned", "OWN", 0);
        vm.deal(address(owned), 1 ether);
        uint256 before = alice.balance;
        owned.withdraw();
        assertEq(alice.balance, before + 1 ether);
        vm.stopPrank();
    }

    // --- Public mint paths ---

    function test_Mint_WithSufficientFee() public {
        feeAgentic.setMintFee(MINT_FEE);
        vm.deal(alice, 1 ether);
        vm.prank(alice);
        uint256 tokenId = feeAgentic.mint{value: MINT_FEE}(alice);
        assertEq(tokenId, 0);
        assertEq(feeAgentic.ownerOf(tokenId), alice);
        assertEq(feeAgentic.tokenCreator(tokenId), alice);
    }

    function test_Mint_RevertsInsufficientFee() public {
        vm.prank(alice);
        vm.expectRevert("Insufficient mint fee");
        feeAgentic.mint{value: 0}(alice);
    }

    function test_MintWithRole_OnlyMinter() public {
        vm.prank(minter);
        uint256 tokenId = agentic.mintWithRole(bob);
        assertEq(agentic.ownerOf(tokenId), bob);

        vm.prank(stranger);
        vm.expectRevert();
        agentic.mintWithRole(bob);
    }

    function test_IMint_StoresDataAndCollectsFee() public {
        vm.prank(alice);
        uint256 tokenId = feeAgentic.iMint{value: MINT_FEE}(alice, _dualData());
        IERC7857.IntelligentData[] memory stored = feeAgentic.getIntelligentDatas(tokenId);
        assertEq(stored.length, 2);
        assertEq(stored[1].dataHash, keccak256("part-b"));
    }

    function test_IMintWithRole_StoresIntelligentData() public {
        vm.prank(minter);
        uint256 tokenId = agentic.iMintWithRole(alice, _singleData(), alice);

        assertEq(tokenId, 0);
        assertEq(agentic.ownerOf(tokenId), alice);
        assertEq(agentic.tokenCreator(tokenId), alice);

        IERC7857.IntelligentData[] memory stored = agentic.getIntelligentDatas(tokenId);
        assertEq(stored.length, 1);
        assertEq(stored[0].dataHash, HASH);
    }

    function test_GetIntelligentDatas_RevertsForMissingToken() public {
        vm.expectRevert();
        agentic.getIntelligentDatas(999);
    }

    function test_IMint_RevertsInsufficientFee() public {
        vm.prank(alice);
        vm.expectRevert("Insufficient mint fee");
        feeAgentic.iMint{value: 0}(alice, _singleData());
    }

    function test_IMintWithRole_RevertsWithoutMinterRole() public {
        vm.prank(stranger);
        vm.expectRevert();
        agentic.iMintWithRole(alice, _singleData(), alice);
    }

    function test_RevokeAuthorization_RevertsWhenNotOwner() public {
        uint256 tokenId = _mintToAlice();
        vm.prank(bob);
        vm.expectRevert("Not the owner");
        agentic.revokeAuthorization(tokenId, carol);
    }

    function test_BatchAuthorizeUsage_RevertsWhenNotOwner() public {
        uint256 tokenId = _mintToAlice();
        uint256[] memory ids = new uint256[](1);
        ids[0] = tokenId;
        vm.prank(bob);
        vm.expectRevert("Not the owner");
        agentic.batchAuthorizeUsage(ids, carol);
    }

    function test_BatchAuthorizeUsage_RevertsAtMax() public {
        uint256 tokenId = _mintToAlice();
        vm.startPrank(alice);
        for (uint256 i = 0; i < 100; i++) {
            agentic.authorizeUsage(tokenId, address(uint160(20_000 + i)));
        }
        uint256[] memory ids = new uint256[](1);
        ids[0] = tokenId;
        vm.expectRevert("Max authorizations reached");
        agentic.batchAuthorizeUsage(ids, address(uint160(88_888)));
        vm.stopPrank();
    }

    function test_ICloneFrom_RevertsWhenFromNotOwner() public {
        uint256 tokenId = _mintToAlice();
        vm.prank(alice);
        vm.expectRevert("Not the owner");
        agentic.iCloneFrom(bob, carol, tokenId, new IERC7857.TransferValidityProof[](0));
    }

    function test_Unpause_RevertsForNonOperator() public {
        vm.prank(operator);
        agentic.pause();
        vm.prank(stranger);
        vm.expectRevert();
        agentic.unpause();
    }

    // --- Signal link ---

    function test_LinkSignal_MapsBothWays() public {
        uint256 tokenId = _mintToAlice();
        vm.prank(operator);
        vm.expectEmit(true, true, true, true);
        emit SignalLinked(tokenId, 7);
        agentic.linkSignal(tokenId, 7);

        assertEq(agentic.linkedSignalId(tokenId), 7);
        assertEq(agentic.signalToTokenId(7), tokenId);
    }

    function test_LinkSignal_RevertsWithoutOperatorRole() public {
        uint256 tokenId = _mintToAlice();
        vm.prank(stranger);
        vm.expectRevert();
        agentic.linkSignal(tokenId, 1);
    }

    function test_LinkSignal_RevertsForMissingToken() public {
        vm.prank(operator);
        vm.expectRevert();
        agentic.linkSignal(0, 1);
    }

    // --- Transfer ---

    function test_ITransferFrom_MovesOwnership() public {
        uint256 tokenId = _mintToAlice();

        vm.prank(alice);
        IERC7857.TransferValidityProof[] memory proofs = new IERC7857.TransferValidityProof[](0);
        vm.expectEmit(true, true, true, true);
        emit IntelligentTransfer(alice, bob, tokenId);
        agentic.iTransferFrom(alice, bob, tokenId, proofs);

        assertEq(agentic.ownerOf(tokenId), bob);
    }

    function test_ITransferFrom_ViaApprovedOperator() public {
        uint256 tokenId = _mintToAlice();
        vm.prank(alice);
        agentic.approve(carol, tokenId);

        vm.prank(carol);
        agentic.iTransferFrom(alice, bob, tokenId, new IERC7857.TransferValidityProof[](0));
        assertEq(agentic.ownerOf(tokenId), bob);
    }

    function test_ITransferFrom_ViaOperatorForAll() public {
        uint256 tokenId = _mintToAlice();
        vm.prank(alice);
        agentic.setApprovalForAll(carol, true);

        vm.prank(carol);
        agentic.iTransferFrom(alice, bob, tokenId, new IERC7857.TransferValidityProof[](0));
        assertEq(agentic.ownerOf(tokenId), bob);
    }

    function test_ITransferFrom_RevertsWhenFromNotOwner() public {
        uint256 tokenId = _mintToAlice();
        vm.prank(alice);
        vm.expectRevert("Not the owner");
        agentic.iTransferFrom(bob, carol, tokenId, new IERC7857.TransferValidityProof[](0));
    }

    function test_ITransferFrom_RevertsWhenNotAuthorized() public {
        uint256 tokenId = _mintToAlice();
        vm.prank(carol);
        vm.expectRevert("Not authorized to transfer");
        agentic.iTransferFrom(alice, bob, tokenId, new IERC7857.TransferValidityProof[](0));
    }

    function test_ITransferFrom_ClearsAuthorizations() public {
        uint256 tokenId = _mintToAlice();
        vm.prank(alice);
        agentic.authorizeUsage(tokenId, carol);
        assertTrue(agentic.isAuthorizedUser(tokenId, carol));

        vm.prank(alice);
        agentic.iTransferFrom(alice, bob, tokenId, new IERC7857.TransferValidityProof[](0));

        assertFalse(agentic.isAuthorizedUser(tokenId, carol));
        assertEq(agentic.authorizedUsersOf(tokenId).length, 0);
    }

    // --- Clone ---

    function test_ICloneFrom_CopiesDataAndSignalLink() public {
        uint256 tokenId = _mintToAlice();
        vm.prank(operator);
        agentic.linkSignal(tokenId, 42);

        vm.prank(alice);
        uint256 cloneId =
            agentic.iCloneFrom(alice, bob, tokenId, new IERC7857.TransferValidityProof[](0));

        assertEq(agentic.ownerOf(cloneId), bob);
        assertEq(agentic.cloneSource(cloneId), tokenId);
        assertEq(agentic.linkedSignalId(cloneId), 42);
        assertEq(agentic.getIntelligentDatas(cloneId).length, 1);
        assertEq(agentic.getIntelligentDatas(cloneId)[0].dataHash, HASH);
    }

    function test_ICloneFrom_RevertsWhenNotAuthorized() public {
        uint256 tokenId = _mintToAlice();
        vm.prank(carol);
        vm.expectRevert("Not authorized to clone");
        agentic.iCloneFrom(alice, bob, tokenId, new IERC7857.TransferValidityProof[](0));
    }

    // --- Authorization ---

    function test_AuthorizeAndRevokeUsage() public {
        uint256 tokenId = _mintToAlice();

        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit UsageAuthorized(tokenId, carol);
        agentic.authorizeUsage(tokenId, carol);

        assertTrue(agentic.isAuthorizedUser(tokenId, carol));
        assertEq(agentic.authorizedUsersOf(tokenId).length, 1);
        assertEq(agentic.authorizedTokensOf(carol).length, 1);

        vm.prank(alice);
        vm.expectEmit(true, true, true, true);
        emit UsageRevoked(tokenId, carol);
        agentic.revokeAuthorization(tokenId, carol);

        assertFalse(agentic.isAuthorizedUser(tokenId, carol));
        assertEq(agentic.authorizedUsersOf(tokenId).length, 0);
        assertEq(agentic.authorizedTokensOf(carol).length, 0);
    }

    function test_AuthorizeUsage_RevertsWhenNotOwner() public {
        uint256 tokenId = _mintToAlice();
        vm.prank(bob);
        vm.expectRevert("Not the owner");
        agentic.authorizeUsage(tokenId, carol);
    }

    function test_AuthorizeUsage_RevertsWhenAlreadyAuthorized() public {
        uint256 tokenId = _mintToAlice();
        vm.startPrank(alice);
        agentic.authorizeUsage(tokenId, carol);
        vm.expectRevert("Already authorized");
        agentic.authorizeUsage(tokenId, carol);
        vm.stopPrank();
    }

    function test_AuthorizeUsage_RevertsAtMax() public {
        uint256 tokenId = _mintToAlice();
        vm.startPrank(alice);
        for (uint256 i = 0; i < 100; i++) {
            agentic.authorizeUsage(tokenId, address(uint160(10_000 + i)));
        }
        vm.expectRevert("Max authorizations reached");
        agentic.authorizeUsage(tokenId, address(uint160(99_999)));
        vm.stopPrank();
    }

    function test_RevokeAuthorization_RevertsWhenNotAuthorized() public {
        uint256 tokenId = _mintToAlice();
        vm.prank(alice);
        vm.expectRevert("Not authorized");
        agentic.revokeAuthorization(tokenId, carol);
    }

    function test_BatchAuthorizeUsage_MultipleTokens() public {
        vm.prank(minter);
        uint256 t0 = agentic.iMintWithRole(alice, _singleData(), alice);
        vm.prank(minter);
        uint256 t1 = agentic.iMintWithRole(alice, _singleData(), alice);

        uint256[] memory ids = new uint256[](2);
        ids[0] = t0;
        ids[1] = t1;

        vm.prank(alice);
        agentic.batchAuthorizeUsage(ids, carol);

        assertTrue(agentic.isAuthorizedUser(t0, carol));
        assertTrue(agentic.isAuthorizedUser(t1, carol));
    }

    function test_BatchAuthorizeUsage_SkipsAlreadyAuthorized() public {
        uint256 tokenId = _mintToAlice();
        vm.startPrank(alice);
        agentic.authorizeUsage(tokenId, carol);

        uint256[] memory ids = new uint256[](1);
        ids[0] = tokenId;
        agentic.batchAuthorizeUsage(ids, carol);
        assertEq(agentic.authorizedUsersOf(tokenId).length, 1);
        vm.stopPrank();
    }

    // --- Delegate ---

    function test_DelegateAccess_SetAndRevoke() public {
        vm.expectEmit(true, true, true, true);
        emit DelegateAccessSet(alice, carol);
        vm.prank(alice);
        agentic.delegateAccess(carol);
        assertEq(agentic.delegatedAssistant(alice), carol);

        vm.expectEmit(true, true, true, true);
        emit DelegateAccessSet(alice, address(0));
        vm.prank(alice);
        agentic.revokeDelegateAccess();
        assertEq(agentic.delegatedAssistant(alice), address(0));
    }

    // --- Metadata ---

    function test_SetTokenURI_ByOwnerAndOperator() public {
        uint256 tokenId = _mintToAlice();
        vm.prank(alice);
        agentic.setTokenURI(tokenId, "0g-storage://0xabc");
        assertEq(agentic.tokenURI(tokenId), "0g-storage://0xabc");

        vm.prank(minter);
        uint256 tokenId2 = agentic.iMintWithRole(bob, _singleData(), bob);
        vm.prank(operator);
        agentic.setTokenURI(tokenId2, "0g-storage://0xdef");
        assertEq(agentic.tokenURI(tokenId2), "0g-storage://0xdef");
    }

    function test_SetTokenURI_RevertsForStranger() public {
        uint256 tokenId = _mintToAlice();
        vm.prank(stranger);
        vm.expectRevert("Not authorized");
        agentic.setTokenURI(tokenId, "bad");
    }

    function test_TokenURI_FallsBackWhenUnset() public {
        uint256 tokenId = _mintToAlice();
        assertEq(agentic.tokenURI(tokenId), "");
    }

    // --- Pausable ---

    function test_Pause_BlocksPublicMint() public {
        feeAgentic.grantRole(feeAgentic.OPERATOR_ROLE(), operator);
        vm.prank(operator);
        feeAgentic.pause();

        vm.prank(alice);
        vm.expectRevert();
        feeAgentic.mint{value: MINT_FEE}(alice);
    }

    function test_Unpause_AllowsMintAgain() public {
        vm.startPrank(operator);
        agentic.pause();
        agentic.unpause();
        vm.stopPrank();

        vm.prank(minter);
        uint256 tokenId = agentic.mintWithRole(alice);
        assertEq(agentic.ownerOf(tokenId), alice);
    }

    function test_Pause_RevertsForNonOperator() public {
        vm.prank(stranger);
        vm.expectRevert();
        agentic.pause();
    }

    // --- ERC721 enumerable ---

    function test_Enumerable_TracksMintedTokens() public {
        _mintToAlice();
        vm.prank(minter);
        agentic.iMintWithRole(bob, _singleData(), bob);

        assertEq(agentic.totalSupply(), 2);
        assertEq(agentic.tokenByIndex(0), 0);
        assertEq(agentic.tokenByIndex(1), 1);
        assertEq(agentic.tokenOfOwnerByIndex(alice, 0), 0);
    }

    // --- Interface support ---

    function test_SupportsInterface_ERC165AndERC721() public view {
        assertTrue(agentic.supportsInterface(type(IERC165).interfaceId));
        assertTrue(agentic.supportsInterface(type(IERC721).interfaceId));
        assertTrue(agentic.supportsInterface(type(IERC721Enumerable).interfaceId));
        assertFalse(agentic.supportsInterface(bytes4(0xdeadbeef)));
    }
}
