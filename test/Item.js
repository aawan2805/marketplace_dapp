import { expect } from "chai";

describe("Item Contract", function () {
    it("should add a new item", async function () {
        const contractFactory = await ethers.getContractFactory('Item');
        const contract = await contractFactory.deploy();
        const [owner] = await ethers.getSigners();

        await contract.addItem(
            "Lacoste shoes", 
            "Brand new green lacoste shoes", 
            Number(10), 
            "image-url"
        );
        const numberOfItems = await contract.itemsCount();
        expect(numberOfItems).to.equal(1);

        const userItems = await contract.retrieveUserItems();
        expect(userItems[0].itemId).to.equal(1)

    });

  
    it("should edit the price of added item", async function() {
        const contractFactory = await ethers.getContractFactory('Item');
        const contract = await contractFactory.deploy();
        const [owner] = await ethers.getSigners();

        await contract.addItem(
            "Lacoste shoes", 
            "Brand new green lacoste shoes", 
            Number(10), 
            "image-url"
        );
        const numberOfItems = await contract.itemsCount();
        expect(numberOfItems).to.equal(1);

        // Edit the item
        await contract.editItem(
            1, // itemId
            "LV shoes",
            "New bought LV shoes",
            Number(150),
            "LV-image"
        )
        const userItems = await contract.retrieveUserItems();
        expect(userItems[0].title).to.equal("LV shoes")
        expect(userItems[0].price).to.equal(Number(150))

    })

});
