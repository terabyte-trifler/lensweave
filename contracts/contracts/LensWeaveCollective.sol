// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * LensWeaveCollective
 * - ERC721
 * - ERC2981 (royalties)
 * - Per-token list of creators and shares (basis points sum to 10_000)
 * - Royalty receiver is this contract; marketplaces send royalties here
 * - Creators can claim their share of this contract's ETH balance (from royalties or primary sales you forward)
 *
 * NOTE (prototype): Royalties are only enforced by marketplaces that respect ERC-2981.
 * This contract lets contributors pull their proportional ETH via `claim()`.
 */

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract LensWeaveCollective is ERC721, ERC2981, Ownable {
    using Strings for uint256;

    struct Split {
        address account;
        uint96 bps; // basis points out of 10_000
    }

    // tokenId => tokenURI (IPFS metadata json)
    mapping(uint256 => string) private _tokenURIs;

    // tokenId => splits
    mapping(uint256 => Split[]) private _splits;

    // Global accounting for claims
    uint256 public totalReceived; // total ETH ever received
    mapping(address => uint256) public released; // how much an address has withdrawn

    uint256 private _tokenIdTracker;

    event Minted(
        uint256 indexed tokenId,
        string uri,
        address[] creators,
        uint96[] sharesBps,
        uint96 royaltyBps
    );

    constructor(address initialOwner)
        ERC721("LensWeave Collective", "LENSW")
        Ownable(initialOwner)
    {}

    receive() external payable {
        totalReceived += msg.value;
    }

    /**
     * Mint a collective NFT
     * @param uri IPFS metadata URI (json) e.g., ipfs://bafy.../metadata.json
     * @param creators array of creator addresses
     * @param sharesBps array of shares in basis points (sum must be 10_000)
     * @param royaltyBps ERC-2981 royalty in basis points (e.g., 500 = 5%)
     * @param to initial owner (can be the caller or a session host)
     */
    function mintCollective(
        string calldata uri,
        address[] calldata creators,
        uint96[] calldata sharesBps,
        uint96 royaltyBps,
        address to
    ) external onlyOwner returns (uint256 tokenId) {
        require(creators.length > 0, "No creators");
        require(creators.length == sharesBps.length, "Length mismatch");
        require(royaltyBps <= 1000, "Royalty too high (>10%)"); // adjust as you wish

        uint256 sum;
        for (uint256 i = 0; i < sharesBps.length; i++) {
            sum += sharesBps[i];
            require(creators[i] != address(0), "Zero creator");
        }
        require(sum == 10_000, "Shares must sum to 10000 bps");

        tokenId = ++_tokenIdTracker;
        _safeMint(to, tokenId);
        _tokenURIs[tokenId] = uri;

        // store splits
        for (uint256 i = 0; i < creators.length; i++) {
            _splits[tokenId].push(Split({account: creators[i], bps: sharesBps[i]}));
        }

        // Set ERC-2981 royalty receiver to the contract itself
        _setTokenRoyalty(tokenId, address(this), royaltyBps);

        emit Minted(tokenId, uri, creators, sharesBps, royaltyBps);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId); // OZ v5 existence assertion
        return _tokenURIs[tokenId];
    }

    function getSplits(uint256 tokenId) external view returns (Split[] memory) {
        _requireOwned(tokenId); // OZ v5 existence assertion
        return _splits[tokenId];
    }

    /**
     * Primary sale helper (optional):
     * If you sell the NFT on primary, send ETH to this contract, then creators call claim().
     */
    function deposit() external payable {
        require(msg.value > 0, "No value");
        totalReceived += msg.value;
    }

    /**
     * Creators claim their proportional share of this contract's ETH balance
     * across ALL tokens they are part of (simple global pot).
     *
     * Prototype math:
     *  - We don't track per-token inflows; we distribute from global pool by sum of bps
     *    across *currently minted* tokens that include the caller.
     *  - For production you'd track per-token inflow snapshots.
     */
    function claim() external {
        uint256 callerBps = _creatorTotalBps(msg.sender);
        require(callerBps > 0, "Not a creator");

        uint256 totalDue = (totalReceived * callerBps) / 10_000;
        uint256 already = released[msg.sender];
        require(totalDue > already, "Nothing to claim");

        uint256 payment = totalDue - already;
        released[msg.sender] = totalDue;

        (bool ok, ) = payable(msg.sender).call{value: payment}("");
        require(ok, "Transfer failed");
    }

    function _creatorTotalBps(address who) internal view returns (uint256) {
        uint256 bpsSum;
        for (uint256 tid = 1; tid <= _tokenIdTracker; tid++) {
            if (_ownerOf(tid) != address(0)) { // OZ v5 existence check
                Split[] memory s = _splits[tid];
                for (uint256 i = 0; i < s.length; i++) {
                    if (s[i].account == who) bpsSum += s[i].bps;
                }
            }
        }
        return bpsSum;
    }

    // ERC-165 support
    function supportsInterface(bytes4 iid) public view override(ERC721, ERC2981) returns (bool) {
        return super.supportsInterface(iid);
    }
}
