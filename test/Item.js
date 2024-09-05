const { ethers } = require('hardhat');
const { expect } = require('chai');
const { Escrow } = require("../src/artifacts/contracts/Escrow.sol/Escrow.json")

describe("Item Contract Extended Tests", function () {
  let itemContract;
  let escrowContract;
  let owner;
  let buyer;
  let seller;
  let arbitrator;

  beforeEach(async function () {
    const Item = await ethers.getContractFactory("Item");
    itemContract = await Item.deploy();

    [owner, seller, buyer, arbitrator] = await ethers.getSigners();
  });

  function printGasUsage(tx, description) {
    return tx.wait().then(receipt => {
      console.log(`${description} Gas used: ${receipt.gasUsed.toString()}`);
    });
  }

  async function measureExecutionTime(fn, description) {
    const startTime = Date.now();
    await fn();
    const endTime = Date.now();
    const timeTaken = endTime - startTime;
    console.log(`${description} Execution time: ${timeTaken}ms`);
  }
  
  it("should edit an item", async function () {
    await measureExecutionTime(async () => {
      // Seller adds an item
      const addItemTx = await itemContract.connect(seller).addItem(
        "Original Item",
        "Original Description",
        ethers.parseUnits("1", "ether"),
        "original.jpg"
      );
      await addItemTx.wait();

      // Seller edits the item
      const editItemTx = await itemContract.connect(seller).editItem(
        1,
        "Edited Item",
        "Edited Description",
        ethers.parseUnits("2", "ether"),
        "edited.jpg"
      );
      await printGasUsage(editItemTx, "Edit Item");

      // Retrieve the item and check if it was edited
      const sellerItems = await itemContract.connect(seller).retrieveUserItems();
      expect(sellerItems[0].title).to.equal("Edited Item");
      expect(sellerItems[0].description).to.equal("Edited Description");
      expect(sellerItems[0].price).to.equal(ethers.parseUnits("2", "ether"));
      expect(sellerItems[0].image).to.equal("edited.jpg");
    }, "Edit Item Execution Time");
  });

  it("should delete an item", async function () {
    await measureExecutionTime(async () => {
      // Seller adds an item
      const addItemTx = await itemContract.connect(seller).addItem(
        "Item to Delete",
        "Description",
        ethers.parseUnits("1", "ether"),
        "image.jpg"
      );
      await addItemTx.wait();

      // Seller deletes the item
      const deleteItemTx = await itemContract.connect(seller).deleteItem(1);
      await printGasUsage(deleteItemTx, "Delete Item");

      // Verify the item list is empty
      const sellerItems = await itemContract.connect(seller).retrieveUserItems();
      expect(sellerItems.length).to.equal(0);
    }, "Delete Item Execution Time");
  });

  it("should show items in myItems()", async function () {
    await measureExecutionTime(async () => {
      // Seller adds multiple items
      await itemContract.connect(seller).addItem(
        "Item 1",
        "Description 1",
        ethers.parseUnits("1", "ether"),
        "image1.jpg"
      );
      await itemContract.connect(seller).addItem(
        "Item 2",
        "Description 2",
        ethers.parseUnits("2", "ether"),
        "image2.jpg"
      );

      // Retrieve seller's items
      const sellerItems = await itemContract.connect(seller).retrieveUserItems();
      expect(sellerItems.length).to.equal(2);
      expect(sellerItems[0].title).to.equal("Item 1");
      expect(sellerItems[1].title).to.equal("Item 2");
    }, "Retrieve myItems Execution Time");
  });

  it("should make a purchase and show it in myPurchases()", async function () {
    await measureExecutionTime(async () => {
      // Seller adds an item
      await itemContract.connect(seller).addItem(
        "Item for Purchase",
        "Description",
        ethers.parseUnits("1", "ether"),
        "image.jpg"
      );

      // Buyer purchases the item
      const purchaseTx = await itemContract.connect(buyer).purchaseItem(1, seller.address, {
        value: ethers.parseUnits("1", "ether"),
      });
      await printGasUsage(purchaseTx, "Purchase Item");

      // Verify the item appears in buyer's purchases
      const buyerPurchases = await itemContract.connect(buyer).myPurchases();
      expect(buyerPurchases.length).to.equal(1);
      expect(buyerPurchases[0].title).to.equal("Item for Purchase");
    }, "Make Purchase Execution Time");
  });

  it("should cancel a purchase and refund the buyer", async function () {
    await measureExecutionTime(async () => {
      // Seller adds an item
      await itemContract.connect(seller).addItem(
        "Item to Cancel",
        "Description",
        ethers.parseUnits("1", "ether"),
        "image.jpg"
      );

      // Buyer purchases the item
      await itemContract.connect(buyer).purchaseItem(1, seller.address, {
        value: ethers.parseUnits("1", "ether"),
      });

      // Capture buyer's balance before cancellation
      const buyerBalanceBefore = await ethers.provider.getBalance(buyer.address);

      // Buyer cancels the purchase within the allowed time
      const cancelTx = await itemContract.connect(buyer).cancelItem(1, seller.address, true, true);
      await printGasUsage(cancelTx, "Cancel Purchase");

      // Verify the item is no longer in buyer's purchases
      const buyerPurchases = await itemContract.connect(buyer).myPurchases();
      expect(buyerPurchases.length).to.equal(0);

      // Verify the buyer received the refund
      const buyerBalanceAfter = await ethers.provider.getBalance(buyer.address);
      expect(buyerBalanceAfter).to.be.gt(buyerBalanceBefore);
    }, "Cancel Purchase Execution Time");
  });
  

  it("should ship an item and set tracking code", async function () {
    // Deploy the contract

    // Seller adds an item
    const addItemTx = await itemContract.connect(seller).addItem(
        "Item 1", 
        "Description 1", 
        ethers.parseUnits("1", "ether"), 
        "image.jpg"
    );
    await addItemTx.wait();

    // Buyer purchases the item
    const purchaseTx = await itemContract.connect(buyer).purchaseItem(1, seller.address, {
        value: ethers.parseUnits("1", "ether"),
    });
    await purchaseTx.wait();

    // Simulate the 15-minute delay
    await ethers.provider.send("evm_increaseTime", [15 * 60]); // 15 minutes in seconds
    await ethers.provider.send("evm_mine"); // mine a new block to apply the time shift

    // Now the seller should be able to ship the item
    const shipTx = await itemContract.connect(seller).shipItem(1, "TRACKING123");
    await shipTx.wait();

    // Check if the tracking number is set correctly (modify this to fit your getter logic)
    const sellerItems = await itemContract.connect(seller).retrieveUserItems();

    const escrowAddress = sellerItems[0].escrow; // Assuming the escrow address is stored here
    const escrowContract = await ethers.getContractAt("Escrow", escrowAddress);

    // Retrieve the tracking number from the escrow contract
    const trackingNumber = await escrowContract.trackingNumber();
    expect(trackingNumber).to.equal("TRACKING123");
  });


  it("should not allow shipping before cancellation period has passed", async function () {
    await measureExecutionTime(async () => {
      // Seller adds an item
      await itemContract.connect(seller).addItem(
        "Early Ship Item",
        "Description",
        ethers.parseUnits("1", "ether"),
        "image.jpg"
      );

      // Buyer purchases the item
      await itemContract.connect(buyer).purchaseItem(1, seller.address, {
        value: ethers.parseUnits("1", "ether"),
      });

      // Attempt to ship the item before cancellation period has passed
      await expect(
        itemContract.connect(seller).shipItem(1, "TRACK456")
      ).to.be.revertedWith("Cannot ship before 15 minute cancellation period has elapsed.");
    }, "Attempt Early Ship Execution Time");
  });

  it("should handle dispute resolution with arbitrator refunding buyer", async function () {
    await measureExecutionTime(async () => {
      // Seller adds an item
      await itemContract.connect(seller).addItem(
        "Disputed Item",
        "Description",
        ethers.parseUnits("1", "ether"),
        "image.jpg"
      );

      // Buyer purchases the item
      await itemContract.connect(buyer).purchaseItem(1, seller.address, {
        value: ethers.parseUnits("1", "ether"),
      });

      // Increase time to allow shipping
      await ethers.provider.send("evm_increaseTime", [60*16]);
      await ethers.provider.send("evm_mine", []);

      // Seller ships the item
      await itemContract.connect(seller).shipItem(1, "TRACK789");

      // Buyer opens a dispute
      const sellerItems = await itemContract.connect(seller).retrieveUserItems();
      const escrowAddress = sellerItems[0].escrow;
      const escrowInstance = await ethers.getContractAt("Escrow", escrowAddress);

      const openDisputeTx = await escrowInstance.connect(buyer).openDispute();
      await printGasUsage(openDisputeTx, "Open Dispute");

      // Seller submits proof
      await escrowInstance.connect(seller).submitSellerProof("Proof of Shipment");

      // Buyer submits proof
      await escrowInstance.connect(buyer).submitBuyerProof("Proof of Non-Receipt");

      // Arbitrator resolves dispute, refunding buyer
      const resolveDisputeTx = await escrowInstance.connect(arbitrator).resolveDispute(true);
      await printGasUsage(resolveDisputeTx, "Resolve Dispute (Refund Buyer)");

      // Verify the escrow state is updated
      const [state] = await escrowInstance.getState();
      expect(state).to.equal(4); // DISPUTE_CLOSED

      // Verify the buyer received the refund
      // (Additional code can be added to check balances if necessary)
    }, "Dispute Resolution Execution Time");
  });

  it("should handle dispute resolution with arbitrator refunding seller", async function () {
    await measureExecutionTime(async () => {
      // Seller adds an item
      await itemContract.connect(seller).addItem(
        "Disputed Item 2",
        "Description",
        ethers.parseUnits("1", "ether"),
        "image.jpg"
      );

      // Buyer purchases the item
      await itemContract.connect(buyer).purchaseItem(1, seller.address, {
        value: ethers.parseUnits("1", "ether"),
      });

      // Increase time to allow shipping
      await ethers.provider.send("evm_increaseTime", [60*16]);
      await ethers.provider.send("evm_mine", []);

      // Seller ships the item
      await itemContract.connect(seller).shipItem(1, "TRACK999");

      // Buyer opens a dispute
      const sellerItems = await itemContract.connect(seller).retrieveUserItems();
      const escrowAddress = sellerItems[0].escrow;
      const escrowInstance = await ethers.getContractAt("Escrow", escrowAddress);

      const openDisputeTx = await escrowInstance.connect(buyer).openDispute();
      await printGasUsage(openDisputeTx, "Open Dispute");

      // Seller submits proof
      await escrowInstance.connect(seller).submitSellerProof("Proof of Shipment");

      // Buyer submits proof
      await escrowInstance.connect(buyer).submitBuyerProof("Fake Proof of Issue");

      // Arbitrator resolves dispute, refunding seller
      const resolveDisputeTx = await escrowInstance.connect(arbitrator).resolveDispute(false);
      await printGasUsage(resolveDisputeTx, "Resolve Dispute (Refund Seller)");

      // Verify the escrow state is updated
      const [state] = await escrowInstance.getState();
      expect(state).to.equal(4); // DISPUTE_CLOSED

      // Verify the seller received the funds
      // (Additional code can be added to check balances if necessary)
    }, "Dispute Resolution Execution Time");
  });

});
