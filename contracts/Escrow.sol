// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract Escrow {
    enum State { AWAITING_PAYMENT, AWAITING_DELIVERY, COMPLETE, DISPUTE }
    
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
        arbitrator = 0x6A7d3230514Ee0E8078F23Cf65b367D9984b055A;  // Replace with your wallet address
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

    function openDispute(string memory proof) external onlyBuyer {
        require(currState == State.AWAITING_DELIVERY, "Cannot open dispute at this stage");
        currState = State.DISPUTE;
        disputeHistory.push(proof);
    }

    function submitSellerProof(string memory proof) external onlySeller {
        require(currState == State.AWAITING_DELIVERY, "Cannot open dispute at this stage");
        sellerSubmittedProof = true;
        sellerProof = proof;
    }

    function resolveDispute(bool refundBuyer, string memory resolutionAction) external onlyArbitrator {
        require(currState == State.DISPUTE, "No active dispute");
        
        if(refundBuyer) {
            payable(buyer).transfer(address(this).balance);
        } else {
            seller.transfer(address(this).balance);
        }
        
        currState = State.COMPLETE;
        disputeHistory.push(resolutionAction);
    }

    function getDisputeHistory() external view returns (string[] memory) {
        return disputeHistory;
    }
}
