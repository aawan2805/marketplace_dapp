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
        console.log("Price is: %s", _price);
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
        // Check if the item belongs to the msg.sender
        require(_itemId > 0 && _itemId <= itemsCount, "Invalid item ID");
        ItemStruct[] storage userItems = items[msg.sender];
        bool itemFound = false;
        for (uint i = 0; i < userItems.length; i++) {
            if (userItems[i].itemId == _itemId) {
                itemFound = true;
                require(!userItems[i].hasBuyer, "Item already sold");
                userItems[i].title = _title;
                userItems[i].description = _description;
                userItems[i].price = _price;
                userItems[i].image = _image;
                break;
            }
        }
        require(itemFound, "Item does not belong to sender");
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

    function retrieveUserItems() external view returns (ItemStruct[] memory) {
        return items[msg.sender];
    }

    function browseItems() external view returns (ItemStruct[] memory) {
        uint totalItems = 0;
        uint currentIndex = 0;

        // Calculate total items excluding the user's items
        for (uint s = 0; s < sellers.length; s++) {
            if (sellers[s] != msg.sender) {
                totalItems += items[sellers[s]].length;
            }
        }

        // Create an array to hold all items
        ItemStruct[] memory allItems = new ItemStruct[](totalItems);

        // Populate the array with items not created by the user
        for (uint s = 0; s < sellers.length; s++) {
            if (sellers[s] != msg.sender) {
                ItemStruct[] storage sellerItems = items[sellers[s]];
                for (uint i = 0; i < sellerItems.length; i++) {
                    allItems[currentIndex] = sellerItems[i];
                    currentIndex++;
                }
            }
        }

        console.log("Total Items: ", totalItems);
        console.log("Current Index: ", currentIndex);

        return allItems;
    }

}

