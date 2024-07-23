// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Item {

    struct ItemStruct {
        uint itemId;
        string title;
        string description;
        uint price;
        string image;
        uint createdAt;
        address buyer;
        bool has_buyer;
    }

    mapping(address => ItemStruct[]) private items;
    address[] private sellers;

    function addItem(
        string memory _title,
        string memory _description,
        uint _price,
        string memory _image
    ) external {
        if (items[msg.sender].length == 0) {
            sellers.push(msg.sender);
        }
        uint newItemId = items[msg.sender].length;
        items[msg.sender].push(ItemStruct(
            newItemId,
            _title,
            _description,
            _price,
            _image,
            block.timestamp,
            address(0),
            false
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
        require(!item.has_buyer, "Item already sold");

        item.title = _title;
        item.description = _description;
        item.price = _price;
        item.image = _image;
    }

    function deleteItem(uint _itemId) external {
        require(_itemId < items[msg.sender].length, "Item does not exist");
        ItemStruct storage item = items[msg.sender][_itemId];
        require(!item.has_buyer, "Item already sold");

        uint lastIndex = items[msg.sender].length - 1;
        if (_itemId != lastIndex) {
            items[msg.sender][_itemId] = items[msg.sender][lastIndex];
            items[msg.sender][_itemId].itemId = _itemId;
        }
        items[msg.sender].pop();
    }

    function addBuyer(address _seller, uint _itemId) external {
        require(_itemId < items[_seller].length, "Item does not exist");
        ItemStruct storage item = items[_seller][_itemId];
        require(!item.has_buyer, "Item already sold");

        item.buyer = msg.sender;
        item.has_buyer = true;
    }

    function retrieveUserPurchases(address _user) external view returns (ItemStruct[] memory) {
        uint purchaseCount = 0;

        // Count purchases across all sellers
        for (uint s = 0; s < sellers.length; s++) {
            address seller = sellers[s];
            for (uint i = 0; i < items[seller].length; i++) {
                if (items[seller][i].buyer == _user) {
                    purchaseCount++;
                }
            }
        }

        // Collect purchases
        ItemStruct[] memory userPurchases = new ItemStruct[](purchaseCount);
        uint index = 0;
        for (uint s = 0; s < sellers.length; s++) {
            address seller = sellers[s];
            for (uint i = 0; i < items[seller].length; i++) {
                if (items[seller][i].buyer == _user) {
                    userPurchases[index] = items[seller][i];
                    index++;
                }
            }
        }

        return userPurchases;
    }
}
