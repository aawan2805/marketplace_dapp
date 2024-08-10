// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Escrow {
    enum State { 
        AWAITING_DELIVERY, 
        DELIVERED,

        DISPUTE_OPENED, 
        SUBMIT_DISPUTE_PROOF, 
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
    
    function confirmDelivery() external onlyBuyer {
        require(currState == State.AWAITING_DELIVERY, "Cannot confirm delivery");
        seller.transfer(address(this).balance);
        currState = State.DELIVERED;
    }

    function openSellerDispute() external onlySeller {
        require(currState == State.AWAITING_DELIVERY, "Cannot open dispute at this stage");
        currState = State.DISPUTE_OPENED;
        disputeHistory.push("Dispute opened by seller.");
    }

    function submitSellerProof(string memory proof) external onlySeller {
        require(currState != State.DELIVERED, "Cannot open dispute at this stage");
        require(currState != State.AWAITING_DELIVERY, "Cannot open dispute at this stage");
        sellerSubmittedProof = true;
        sellerProof = proof;
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
}
