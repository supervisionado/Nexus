// SPDX-License-Identifier: MIT
//
//  $$\   $$\                                               $$\      $$\                     $$\                  $$\               $$\                               
//  $$$\  $$ |                                              $$$\    $$$ |                    $$ |                 $$ |              $$ |                              
//  $$$$\ $$ | $$$$$$\  $$\   $$\ $$\   $$\  $$$$$$$\       $$$$\  $$$$ | $$$$$$\   $$$$$$\  $$ |  $$\  $$$$$$\ $$$$$$\    $$$$$$\  $$ | $$$$$$\   $$$$$$$\  $$$$$$\  
//  $$ $$\$$ |$$  __$$\ \$$\ $$  |$$ |  $$ |$$  _____|      $$\$$\$$ $$ | \____$$\ $$  __$$\ $$ | $$  |$$  __$$\\_$$  _|  $$  __$$\ $$ | \____$$\ $$  _____|$$  __$$\ 
//  $$ \$$$$ |$$$$$$$$ | \$$$$  / $$ |  $$ |\$$$$$$\        $$ \$$$  $$ | $$$$$$$ |$$ |  \__|$$$$$$  / $$$$$$$$ | $$ |    $$ /  $$ |$$ | $$$$$$$ |$$ /      $$$$$$$$ |
//  $$ |\$$$ |$$   ____| $$  $$<  $$ |  $$ | \____$$\       $$ |\$  /$$ |$$  __$$ |$$ |      $$  _$$<  $$   ____| $$ |$$\ $$ |  $$ |$$ |$$  __$$ |$$ |      $$   ____|
//  $$ | \$$ |\$$$$$$$\ $$  /\$$\ \$$$$$$  |$$$$$$$  |      $$ | \_/ $$ |\$$$$$$$ |$$ |      $$ | \$$\ \$$$$$$$\  \$$$$  |$$$$$$$  |$$ |\$$$$$$$ |\$$$$$$$\ \$$$$$$$\ 
//  \__|  \__| \_______|\__/  \__| \______/ \_______/       \__|     \__| \_______|\__|      \__|  \__| \_______|  \____/ $$  ____/ \__| \_______| \_______| \_______|
//                                                                                                                        $$ |                                        
//  coded by SuperVisionado, as a part of PhanicVerse                                                                     $$ |                                        
//                                                                                                                        \__|                                        
pragma solidity ^0.8.33;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract Nexus is Ownable, ReentrancyGuard, Pausable {

    using Address for address payable;

    // Listing
    struct Listing {
        address payable seller;   // 20 bytes
        uint96 price;             // 12 bytes
        uint64 expiration;        // 8 bytes
        bool active;              // 1 byte
    } 

    // User stats
    struct TradesInfo {
        uint128 salesVol;
        uint32 sales;
        uint32 purchases;
        uint32 listings;
    }

    /* Configs */
    address private collection;
    uint96 private _floor_price;
    uint96 private _nexus_fee;
    uint32 private _royalties_bps;
    bool private _collection_lock;    

    /* Stats */
    uint32 private _totalListed;
    uint256 private _allTimesTotalSales;
    uint256 private _salesWithdrew;
    mapping(address => TradesInfo) private _totalUserTrades;

    /* Listings */
    mapping(uint256 => Listing) private _catalog;

    /* Errors */
    error NullAddressNotAllowed();
    error UnAuthorized();
    error InputOutOfRange();
    error ListingInactiveOrExpired();
    error InsufficientFunds();
    error OwnerChanged();
    error EmptyAccount();

    /* Events */
    event ListingCreated(
    uint256 indexed tokenId,
    address indexed seller,
    uint96 price,
    uint64 expiration);

    event ListingDisabled(
    uint256 indexed tokenId,
    address indexed seller);

    event ListingPurchased(
    uint256 indexed tokenId,
    address indexed seller,
    address indexed buyer,
    uint96 price);

    event FeesUpdated(
    uint96 floorPrice,
    uint96 marketplaceFee,
    uint32 royaltiesBps);

    event ListingExpired(uint256 indexed tokenId);    

    /****************************** 
     * 
     *   Constructor (Set variables to initial values)
     * 
     *************************************************************/       

    constructor() 
        Ownable(msg.sender) 
    {
        collection = address(0x67c932c45480F77C59A31cA817C0CbC6e13296bB);
        _floor_price = 0.02 ether;
        _nexus_fee = 0.001 ether;
        _royalties_bps = 500;
    }

    /****************************** 
     * 
     *   Listing (LIST, BUY, FETCH, DISABLE) related functions
     * 
     *************************************************************/    

    /// Allow token onwer to write a listing to the catalog
    /// @param tokenId token number
    /// @param price listing price
    /// @param durationSec duraction of listing validity in seconds
    function listForSale(uint256 tokenId, uint96 price, uint64 durationSec) external whenNotPaused {

        IERC721 nft = IERC721(collection);
        Listing storage lst = _catalog[tokenId]; 
        
        // Check for ownershop of the token
        if (nft.ownerOf(tokenId)!=msg.sender) revert UnAuthorized();
        // Check for floor price, and a minimum 1h duration
        if ((durationSec<3600) || (price<_floor_price)) revert InputOutOfRange();
        // Fix stats for older listing & expired listings event
        if (lst.active) {
                    unchecked {
                        --_totalListed;
                        --_totalUserTrades[lst.seller].listings; }
                    if (block.timestamp > lst.expiration) emit ListingExpired(tokenId);
        }

        if (!_collection_lock) {
            _collection_lock = true;
        }

        // Write to catalog
        _catalog[tokenId] = Listing({
                                seller: payable(msg.sender),
                                price: price,
                                expiration: uint64(block.timestamp + durationSec),
                                active: true
                            });
        
        // Update stats
        unchecked {
            ++_totalListed;
            ++_totalUserTrades[msg.sender].listings; 
        }

        // Emit
        emit ListingCreated(tokenId, msg.sender, price, uint64(block.timestamp + durationSec));

    }

    /// Used for anyone that wants to make a purchase of a listed token on market
    /// @param tokenId token number
    function buyListing(uint256 tokenId) external nonReentrant payable whenNotPaused {

        Listing storage trade = _catalog[tokenId];     
        IERC721 nft = IERC721(collection);  

        TradesInfo storage sellerStats = _totalUserTrades[trade.seller];
        TradesInfo storage buyerStats = _totalUserTrades[msg.sender];

        // Check if listing still active
        if (!trade.active) revert ListingInactiveOrExpired();
        // Check if listing is not expired
        if (block.timestamp >= trade.expiration) revert ListingInactiveOrExpired();

        // Calcute listing price, adding X% to the price, plus fixed market fee
        uint256 price_after = trade.price;
        price_after = price_after * (10000 + _royalties_bps);
        price_after = price_after / 10000;
        price_after += _nexus_fee; 

        // Check if the listing price was sent correctly
        if (msg.value < price_after) revert InsufficientFunds();
        // Check for ownership of the original maker
        if (nft.ownerOf(tokenId)!=trade.seller) revert OwnerChanged();
        // Check for approval for Nexus contract
        bool approved =
        nft.isApprovedForAll(trade.seller, address(this))
         || nft.getApproved(tokenId) == address(this);
        if (!approved) revert UnAuthorized();        
  
        // Pay seller & transfer to new owner
        nft.transferFrom(trade.seller, msg.sender, tokenId);        
        payable(trade.seller).sendValue(trade.price);

        // Update stats
        unchecked {
            ++sellerStats.sales;
            sellerStats.salesVol += uint128(trade.price);
            --sellerStats.listings;        
            ++buyerStats.purchases;
            --_totalListed;
            ++_allTimesTotalSales;
        }

        // Turn the listing off
        trade.active = false; 

        // Emit
        emit ListingPurchased(tokenId, trade.seller, msg.sender, trade.price);

    }

    /// Fetch a specific listing 
    /// @param tokenId token number
    function fetchTokenListing(uint256 tokenId) external view whenNotPaused returns (Listing memory) {
        return _catalog[tokenId];
    }      

    /// Allow the token owner to disable the listing OR any user to disable expired listing
    /// @param tokenId token number
    function disableListing(uint256 tokenId) external whenNotPaused { 

        Listing storage lst = _catalog[tokenId]; 
        IERC721 nft = IERC721(collection);

        // Already inactive listings must be ignored
        if (!lst.active) revert ListingInactiveOrExpired();  

        // Any user can disable expired listing
        if (block.timestamp >= lst.expiration) {
            unchecked {
                --_totalListed;
                --_totalUserTrades[lst.seller].listings; 
            }
            lst.active = false;
            emit ListingExpired(tokenId);
            return;
        }
        
        // Just owner OR original seller can disable listing
        if ((nft.ownerOf(tokenId)!=msg.sender) && 
            (lst.seller!=msg.sender)) 
            revert UnAuthorized();

        // Fix stats & disable listing emitting event
        unchecked {
            --_totalListed;
            --_totalUserTrades[lst.seller].listings; 
        }
        lst.active = false;
        emit ListingDisabled(tokenId, msg.sender);
        
    }

    /****************************** 
     * 
     *   Withdraw
     * 
     *************************************************************/        

    /// Allows the owner to withdraw ALL collected funds (royalties + nexus fees)
    function withdrawAll() public nonReentrant onlyOwner {
        uint256 balance = address(this).balance;
        if (balance==0) revert EmptyAccount();
        payable(owner()).sendValue(balance);
    }   

    /****************************** 
     * 
     *   Configuration related get&set functions
     * 
     *************************************************************/     

    /// Get the NFT collection address
    function getCollectionAddr() public view returns (address) {
        return collection;
    }

    /// Set the NFT collection address
    /// @param newAddr Collection address
    function setCollectionAddr(address newAddr) external onlyOwner {
        if (_collection_lock) revert UnAuthorized();
        if (newAddr==address(0)) revert NullAddressNotAllowed();
        collection = newAddr;
    }

    /// Get the basis point of royaltie fees
    function getRoyaltiesBPS() public view returns (uint32) {
        return _royalties_bps;
    }

    /// Get fixed fees (in wei)
    function getMarketplaceFee() public view returns (uint256) {
        return _nexus_fee;
    }

    /// Get floor price (in wei)
    function getFloorPrice() public view returns (uint256) {
        return _floor_price;
    }        

    /// Set the royaltie fees
    /// @param newfee BPS fees
    function setRoyaltiesBPS(uint32 newfee) external onlyOwner {
        if (newfee>9999) revert InputOutOfRange();
        _royalties_bps = newfee;
        emit FeesUpdated(_floor_price, _nexus_fee, _royalties_bps);
    }    

    /// Set fixed fee per transaction (in wei)
    function setMarketplaceFee(uint96 newFee) external onlyOwner {
        _nexus_fee = newFee;
        emit FeesUpdated(_floor_price, _nexus_fee, _royalties_bps);
    } 

    /// Set NFT floor price (in wei)
    function setFloorPrice(uint96 newPrice) external onlyOwner {
        _floor_price = newPrice;
        emit FeesUpdated(_floor_price, _nexus_fee, _royalties_bps);
    }     

    /****************************** 
     * 
     *   Stats retrieve functions
     * 
     *************************************************************/       

    /// Get total number of sales of all times since deploy
    function getMarketplaceTotalSales() public view returns (uint256) {
        return _allTimesTotalSales;
    }

    /// Get total number of active listings
    function getMarketplaceTotalListings() public view returns (uint256) {
        return _totalListed;
    }    

    /// Get sales volume of specific user
    /// @param user User address
    function getUserSalesVolume(address user) external view returns (uint256) {
        return _totalUserTrades[user].salesVol;
    } 

    /// Get total number of user sales
    /// @param user User address
    function getUserSales(address user) external view returns (uint256) {
        return _totalUserTrades[user].sales;
    }  

    /// Get total number of user active listings
    /// @param user User address
    function getUserListings(address user) external view returns (uint256) {
        return _totalUserTrades[user].listings;
    }      

    /// Get total number of user puchases
    /// @param user User address
    function getUserPurchases(address user) external view returns (uint256) {
        return _totalUserTrades[user].purchases;
    }     


  
}
