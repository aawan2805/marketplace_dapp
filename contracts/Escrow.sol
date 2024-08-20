// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

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
    address public buyer;
    address payable public seller;
    address private arbitrator;
    string[] public disputeHistory;
    bool private sellerSubmittedProof;
    string private sellerProof;
    string private buyerProof;
    string private trackingNumber;


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

    constructor(address _buyer, address payable _seller) payable {
        buyer = _buyer;
        seller = _seller;
        arbitrator = 0x6A7d3230514Ee0E8078F23Cf65b367D9984b055A;
        currState = State.AWAITING_DELIVERY;
        sellerSubmittedProof = false;
        boughtAt = block.timestamp;
    }
    
    function ship(string memory tracking) external onlySeller {
        require(currState == State.AWAITING_DELIVERY, "Cannot ship. Incorrect status.");
        currState = State.SHIPPED_OUT_BY_SELLER;
        trackingNumber = tracking;
        disputeHistory.push("Item sent by the seller.");
    }

    function confirmDelivery() external onlyBuyer {
        require(currState == State.SHIPPED_OUT_BY_SELLER, "Cannot confirm delivery");
        seller.transfer(address(this).balance);
        currState = State.DELIVERY_CONFIRMED_BY_BUYER;
        disputeHistory.push("Item recieved by the buyer.");
    }

    // Disputes
    function openBuyerDispute(string memory proof) external onlyBuyer {
        require(currState == State.SHIPPED_OUT_BY_SELLER, "Cannot open dispute at this stage");
        currState = State.DISPUTE_OPENED;
        buyerProof = proof;
        disputeHistory.push("Dispute opened by buyer.");
    }

    function submitSellerProof(string memory proof) external onlySeller {
        require(currState == State.DISPUTE_OPENED, "Cannot submit proof without an active dispute.");
        require(sellerSubmittedProof == false, "You've already submitted a proof.");
        sellerSubmittedProof = true;
        sellerProof = proof;
        disputeHistory.push("Seller submitted proof.");
    }

    function submitBuyerProof(string memory proof) external onlyBuyer {
        require(currState == State.DISPUTE_OPENED, "Cannot submit proof without an active dispute.");
        buyerProof = proof;
        disputeHistory.push("Buyer submitted additional proof.");
    }

    function resolveDispute(bool refundBuyer) external onlyArbitrator {
        require(currState == State.DISPUTE_OPENED, "No active dispute");
        if(refundBuyer) {
            disputeHistory.push("Buyer was refunded.");
            payable(buyer).transfer(address(this).balance);
        } else {
            disputeHistory.push("Seller was refunded.");
            seller.transfer(address(this).balance);
        }
        
        currState = State.DISPUTE_CLOSED;
    }

    function getDisputeHistory() external view returns (string[] memory) {
        return disputeHistory;
    }

    function getState() external view returns (State, string memory) {
        return (currState, trackingNumber);
    }
}
