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
        address seller;
    }

    mapping(address => ItemStruct[]) private items;
    uint public itemsCount;
    address[] private sellers;

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
            Escrow(address(0)),
            msg.sender
        ));
    }

    function editItem(
        uint _itemId,
        string memory _title,
        string memory _description,
        uint _price,
        string memory _image
    ) external {
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
        ItemStruct[] storage userItems = items[msg.sender];
        bool itemFound = false;
        uint itemIndex;

        for (uint i = 0; i < userItems.length; i++) {
            if (userItems[i].itemId == _itemId) {
                require(!userItems[i].hasBuyer, "Item already sold");
                itemFound = true;
                itemIndex = i;
                break;
            }
        }

        require(itemFound, "Item does not exist");

        uint lastIndex = userItems.length - 1;
        if (itemIndex != lastIndex) {
            userItems[itemIndex] = userItems[lastIndex];
            userItems[itemIndex].itemId = _itemId;
        }
        userItems.pop();
    }

    function retrieveUserItems() external view returns (ItemStruct[] memory) {
        return items[msg.sender];
    }

    function browseItems() external view returns (ItemStruct[] memory) {
        uint totalItems = 0;
        uint currentIndex = 0;

        for (uint s = 0; s < sellers.length; s++) {
            if (sellers[s] != msg.sender) {
                totalItems += items[sellers[s]].length;
            }
        }

        ItemStruct[] memory allItems = new ItemStruct[](totalItems);

        for (uint s = 0; s < sellers.length; s++) {
            if (sellers[s] != msg.sender) {
                ItemStruct[] storage sellerItems = items[sellers[s]];
                for (uint i = 0; i < sellerItems.length; i++) {
                    if (!sellerItems[i].hasBuyer) {
                        allItems[currentIndex] = sellerItems[i];
                        currentIndex++;
                    }
                }
            }
        }

        console.log("Total Items: ", totalItems);
        console.log("Current Index: ", currentIndex);

        return allItems;
    }

    function purchaseItem(uint _itemId, address _seller) external payable {
        // Ensure the item exists
        require(_itemId > 0 && _itemId <= itemsCount, "Invalid item ID");

        // Retrieve the seller's items
        ItemStruct[] storage userItems = items[_seller];
        bool itemFound = false;
        uint itemIndex;

        // Find the item in the seller's list
        for (uint i = 0; i < userItems.length; i++) {
            if (userItems[i].itemId == _itemId) {
                itemFound = true;
                itemIndex = i;
                break;
            }
        }

        // Ensure the item is found and has no buyer yet
        require(itemFound, "Item not found");
        require(!userItems[itemIndex].hasBuyer, "Item already sold");
        require(userItems[itemIndex].seller == _seller, "Owner can not buy the item.");

        // Ensure the correct amount of ether is sent
        require(msg.value == userItems[itemIndex].price, "Incorrect amount of ether sent got");

        // Create a new Escrow contract instance
        Escrow escrow = (new Escrow){value: msg.value}(msg.sender, payable(_seller));

        // Update the item details
        userItems[itemIndex].buyer = msg.sender;
        userItems[itemIndex].hasBuyer = true;
        userItems[itemIndex].escrow = escrow;

        console.log("Item purchased: %s by %s", userItems[itemIndex].title, msg.sender);
    }


    function myPurchases() external view returns (ItemStruct[] memory) {
        uint totalPurchases = 0;
        uint currentIndex = 0;

        // First count the number of purchases by the caller
        for (uint s = 0; s < sellers.length; s++) {
            ItemStruct[] storage sellerItems = items[sellers[s]];
            for (uint i = 0; i < sellerItems.length; i++) {
                if (sellerItems[i].buyer == msg.sender) {
                    totalPurchases++;
                }
            }
        }

        // Create an array with the exact number of purchases
        ItemStruct[] memory purchases = new ItemStruct[](totalPurchases);

        // Populate the purchases array with the actual purchases
        for (uint s = 0; s < sellers.length; s++) {
            ItemStruct[] storage sellerItems = items[sellers[s]];
            for (uint i = 0; i < sellerItems.length; i++) {
                if (sellerItems[i].buyer == msg.sender) {
                    purchases[currentIndex] = sellerItems[i];
                    currentIndex++;
                }
            }
        }

        return purchases;
    }

}
