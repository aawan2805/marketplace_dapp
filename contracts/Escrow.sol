// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Escrow {
    enum State { AWAITING_PAYMENT, AWAITING_DELIVERY, COMPLETE }
    
    State public currState;
    
    address public buyer;
    address payable public seller;
    
    modifier onlyBuyer() {
        require(msg.sender == buyer, "Only buyer can call this method");
        _;
    }
    
    constructor(address _buyer, address payable _seller) payable {
        buyer = _buyer;
        seller = _seller;
        currState = State.AWAITING_PAYMENT;
    }
    
    function deposit() external payable onlyBuyer {
        require(currState == State.AWAITING_PAYMENT, "Already paid");
        currState = State.AWAITING_DELIVERY;
    }
    
    function confirmDelivery() external onlyBuyer {
        require(currState == State.AWAITING_DELIVERY, "Cannot confirm delivery");
        seller.transfer(address(this).balance);
        currState = State.COMPLETE;
    }
}
