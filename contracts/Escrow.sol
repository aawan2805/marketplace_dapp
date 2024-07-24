// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "./Item.sol";

contract Escrow {
    Item public itemContract;

    struct EscrowStruct {
        address buyer;
        address seller;
        uint itemId;
        uint price;
        bool isCompleted;
    }

    mapping(uint => EscrowStruct) public escrows;
    uint public escrowCount;

    function createEscrow(address _buyer, address _seller, uint _itemId, uint _price) external returns (address) {
        escrowCount++;
        escrows[escrowCount] = EscrowStruct(_buyer, _seller, _itemId, _price, false);
        return address(this);
    }

    function confirmDelivery(uint _escrowId) external {
        require(escrows[_escrowId].buyer == msg.sender, "Only buyer can confirm");
        require(!escrows[_escrowId].isCompleted, "Escrow already completed");

        escrows[_escrowId].isCompleted = true;
        payable(escrows[_escrowId].seller).transfer(escrows[_escrowId].price);
    }

    function refundBuyer(uint _escrowId) external {
        // require(msg.sender == itemContract.buyer, "Only buyer can refund");
        require(!escrows[_escrowId].isCompleted, "Escrow already completed");

        escrows[_escrowId].isCompleted = true;
        payable(escrows[_escrowId].buyer).transfer(escrows[_escrowId].price);
    }
}

