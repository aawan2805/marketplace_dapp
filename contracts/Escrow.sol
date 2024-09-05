// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;
import "hardhat/console.sol";

contract Escrow {
    enum State { 
        AWAITING_DELIVERY, 
        SHIPPED_OUT_BY_SELLER,
        DELIVERY_CONFIRMED_BY_BUYER,

        DISPUTE_OPENED, 
        DISPUTE_CLOSED 
    }
    
    uint public boughtAt;
    State public currState;
    address payable public buyer;
    address payable public seller;
    address private arbitrator;
    string[] public disputeHistory;
    bool private sellerSubmittedProof;
    string public sellerProof;
    string public buyerProof;
    bool public isDisputeOpen;
    string public trackingNumber;


    modifier onlyBuyer() {
        require(msg.sender == buyer, "Only buyer can call this method");
        _;
    }

    modifier onlySeller() {
        require(msg.sender == seller, "Only seller can call this method");
        _;
    }

    modifier onlyArbitrator() {
        require(msg.sender == arbitrator, "Only arbitrator can call this method");
        _;
    }

    constructor(address payable _buyer, address payable _seller) payable {
        buyer = _buyer;
        seller = _seller;
        arbitrator = 0x6A7d3230514Ee0E8078F23Cf65b367D9984b055A;
        currState = State.AWAITING_DELIVERY;
        sellerSubmittedProof = false;
        boughtAt = block.timestamp;
        disputeHistory.push("Item bought.");
        isDisputeOpen = false;
    }
    
    function ship(string memory _tracking) external {
        require(currState == State.AWAITING_DELIVERY, "Cannot ship. Incorrect status.");
        require(block.timestamp >= boughtAt + 15 minutes, "Cannot ship before 15 minute cancellation period has elapsed.");
        currState = State.SHIPPED_OUT_BY_SELLER;
        trackingNumber = _tracking;
        disputeHistory.push("Item sent by the seller.");
        console.log("Tracking number set: %s ", trackingNumber);
    }

    function confirmDelivery() external onlyBuyer {
        require(currState == State.SHIPPED_OUT_BY_SELLER, "Cannot confirm delivery");
        seller.transfer(address(this).balance);
        currState = State.DELIVERY_CONFIRMED_BY_BUYER;
        disputeHistory.push("Item recieved by the buyer.");
    }

    function refundBuyerForCancelItem() payable external {
        require(currState == State.AWAITING_DELIVERY, "Cannot refund. Item has already been shipped or is in another state.");
        require(block.timestamp < boughtAt + 15 minutes, "Cancellation period has passed.");

        buyer.transfer(address(this).balance);

        currState = State.DISPUTE_CLOSED; // State updated to reflect the refund
        disputeHistory.push("Item cancelled and refunded to the buyer.");

    }

    // Disputes
    function openDispute() external onlyBuyer {
        require(currState == State.SHIPPED_OUT_BY_SELLER, "Cannot open dispute at this stage");
        currState = State.DISPUTE_OPENED;
        isDisputeOpen = true;
        disputeHistory.push("Dispute opened by the buyer.");
    }

    function submitSellerProof(string memory proof) external onlySeller {
        require(currState == State.DISPUTE_OPENED, "No active dispute");
        require(bytes(sellerProof).length == 0, "Proof already submitted by seller");
        sellerProof = proof;
    }

    function submitBuyerProof(string memory proof) external onlyBuyer {
        require(currState == State.DISPUTE_OPENED, "No active dispute");
        require(bytes(buyerProof).length == 0, "Proof already submitted by buyer");
        require(bytes(sellerProof).length > 0, "Seller must submit proof first");
        buyerProof = proof;
    }

    function resolveDispute(bool refundBuyer) payable external onlyArbitrator {
        require(currState == State.DISPUTE_OPENED, "No active dispute");
        if (refundBuyer) {
            buyer.transfer(address(this).balance);
            disputeHistory.push("Dispute closed. Buyer was refunded.");
        } else {
            seller.transfer(address(this).balance);
            disputeHistory.push("Dispute closed. Seller was refunded.");
        }
        currState = State.DISPUTE_CLOSED;
        isDisputeOpen = false;
    }

    function getDisputeHistory() external view returns (string[] memory, string memory, string memory) {
        return (disputeHistory, sellerProof, buyerProof);
    }

    function getState() external view returns (State, string memory, string memory, string memory) {
        return (currState, trackingNumber, sellerProof, buyerProof);
    }

}
