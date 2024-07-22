// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Escrow {

    struct Agreement {
        address buyer;
        address seller;
        address arbitrator;
        uint amount;
        bool buyerIn;
        bool sellerIn;
        uint purchaseDateTime;
        uint productId;
    }

    Agreement[] public agreements;

    function newAgreement(address _buyer, address _seller, uint _amount, uint purchaseTime, uint productId) external returns (uint) {
        require(_buyer != _seller, "same buyer and seller");
        agreements.push(Agreement(_buyer,_seller, msg.sender, _amount, false, false, purchaseTime, productId));
        return agreements.length - 1;
    }

    function deposit(uint _id) external payable {
        if (msg.sender == agreements[_id].buyer && msg.value == agreements[_id].amount) {
            agreements[_id].buyerIn = true;
        }
        else if (msg.sender == agreements[_id].seller && msg.value == agreements[_id].amount) {
            agreements[_id].sellerIn = true;
        }
    }

    function refund(uint _id) external {
        if (msg.sender == agreements[_id].buyer && agreements[_id].buyerIn == true) {
            agreements[_id].buyerIn = false;
            payable(agreements[_id].buyer).transfer(agreements[_id].amount);
        }
        if (msg.sender == agreements[_id].seller && agreements[_id].sellerIn == true) {
            agreements[_id].sellerIn = false;
            payable(agreements[_id].seller).transfer(agreements[_id].amount);
        }
    }

    function complete(uint _id, address _winner) external {
        require(msg.sender == agreements[_id].arbitrator, "Only arbitrator can complete");
        require(agreements[_id].buyerIn == true, "buyer has not paid");
        require(agreements[_id].sellerIn == true, "seller has not paid");
        
        if (agreements[_id].buyer == _winner) {
            agreements[_id].buyerIn = false;
            agreements[_id].sellerIn = false;
            payable(agreements[_id].buyer).transfer(agreements[_id].amount * 2);
        }
        else if (agreements[_id].seller == _winner) {
            agreements[_id].buyerIn = false;
            agreements[_id].sellerIn = false;
            payable(agreements[_id].seller).transfer(agreements[_id].amount * 2);
        }
    }

    function isProductInAgreements(uint productId) external view returns (bool) {
        for (uint i = 0; i < agreements.length; i++) {
            if (agreements[i].productId == productId) {
                return true;
            }
        }
        return false;
    }
}