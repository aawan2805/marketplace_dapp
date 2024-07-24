// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "./Escrow.sol";
import "hardhat/console.sol";

contract Item {
    struct ItemStruct {
        uint itemId;
        string title;
        string description;
        uint price;
        string image;
        uint createdAt;
        address buyer;
        bool hasBuyer;
        Escrow escrow;
    }

    mapping(address => ItemStruct[]) private items;
    uint public itemsCount;
    address[] private sellers;

    // Escrow Contract instance
    // Escrow public escrowContract;

    // constructor() {
    //     escrowContract = new Escrow(address(this));
    // }

    function addItem(
        string memory _title,
        string memory _description,
        uint _price,
        string memory _image
    ) external {
        if (items[msg.sender].length == 0) {
            sellers.push(msg.sender);
        }
        itemsCount++;
        items[msg.sender].push(ItemStruct(
            itemsCount,
            _title,
            _description,
            _price,
            _image,
            block.timestamp,
            address(0),
            false,
            Escrow(address(0))
        ));
    }

    function editItem(
        uint _itemId,
        string memory _title,
        string memory _description,
        uint _price,
        string memory _image
    ) external {
        require(_itemId < items[msg.sender].length, "Item does not exist");
        ItemStruct storage item = items[msg.sender][_itemId];
        require(!item.hasBuyer, "Item already sold");

        item.title = _title;
        item.description = _description;
        item.price = _price;
        item.image = _image;
    }

    function deleteItem(uint _itemId) external {
        require(_itemId < items[msg.sender].length, "Item does not exist");
        ItemStruct storage item = items[msg.sender][_itemId];
        require(!item.hasBuyer, "Item already sold");

        uint lastIndex = items[msg.sender].length - 1;
        if (_itemId != lastIndex) {
            items[msg.sender][_itemId] = items[msg.sender][lastIndex];
            items[msg.sender][_itemId].itemId = _itemId;
        }
        items[msg.sender].pop();
    }
/*
    function addBuyer(address _seller, uint _itemId) external {
        require(_itemId < items[_seller].length, "Item does not exist");
        ItemStruct storage item = items[_seller][_itemId];
        require(!item.hasBuyer, "Item already sold");

        escrowContract.createEscrow(msg.sender, _seller, _itemId, item.price);
        item.buyer = msg.sender;
        item.hasBuyer = true;
    }

    // function confirmDelivery(address _seller, uint _itemId) external {
    //     require(_itemId < items[_seller].length, "Item does not exist");
    //     ItemStruct storage item = items[_seller][_itemId];
    //     require(msg.sender == item.buyer, "Only buyer can confirm");

    //     // escrowContract.confirmDelivery(_seller, _itemId);
    // }
    */

    function retrieveUserItems() external view returns (ItemStruct[] memory) {
        console.log("From: %s", msg.sender);
        return items[msg.sender];
    }

    // function retrieveUserPurchases(address _user) external view returns (ItemStruct[] memory) {
    //     uint itemCount = 0;

    //     // Count items the user has listed for sale
    //     itemCount += items[_user].length;

    //     // Count items the user has purchased
    //     for (uint s = 0; s < sellers.length; s++) {
    //         address seller = sellers[s];
    //         for (uint i = 0; i < items[seller].length; i++) {
    //             if (items[seller][i].buyer == _user) {
    //                 itemCount++;
    //             }
    //         }
    //     }

    //     ItemStruct[] memory userItems = new ItemStruct[](itemCount);
    //     uint index = 0;

    //     // Add items the user has listed for sale
    //     for (uint i = 0; i < items[_user].length; i++) {
    //         userItems[index] = items[_user][i];
    //         index++;
    //     }

    //     // Add items the user has purchased
    //     for (uint s = 0; s < sellers.length; s++) {
    //         address seller = sellers[s];
    //         for (uint i = 0; i < items[seller].length; i++) {
    //             if (items[seller][i].buyer == _user) {
    //                 userItems[index] = items[seller][i];
    //                 index++;
    //             }
    //         }
    //     }

    //     return userItems;
    // }

}

