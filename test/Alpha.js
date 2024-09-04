import pkg from 'hardhat';
const { ethers } = pkg;
import { expect } from 'chai';


describe("Item Contract", function () {
  let itemContract;
  let escrowContract;
  let owner;
  let buyer;
  let seller;

  beforeEach(async function () {
    const Item = await ethers.getContractFactory("Item");
    itemContract = await Item.deploy();
    await itemContract.deployed();

    [owner, seller, buyer] = await ethers.getSigners();
  });

  function printGasUsage(tx, description) {
    return tx.wait().then(receipt => {
      console.log(`${description} Gas used: ${receipt.gasUsed.toString()}`);
    });
  }

  function printExecutionTime(fn, description) {
    console.time(description);
    return fn().finally(() => console.timeEnd(description));
  }

  it("should add an item", async function () {
    await printExecutionTime(async () => {
      const addItemTx = await itemContract.connect(seller).addItem(
        "Item 1", 
        "This is item 1", 
        ethers.utils.parseUnits("1", "ether"), 
        "image.jpg"
      );
      await printGasUsage(addItemTx, "Add Item");
  
      const sellerItems = await itemContract.connect(seller).retrieveUserItems();
      expect(sellerItems.length).to.equal(1);
      expect(sellerItems[0].title).to.equal("Item 1");
    }, "Add Item Execution Time");
  });
});
