module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  const escrowContract = await deploy("Escrow", {
    contract: "Escrow",
    from: deployer,
    args: [],
    log: true,
  });
  await deploy("Item", {
    contract: "Item",
    from: deployer,
    args: [escrowContract.address],
    log: true,
  });
};
module.exports.tags = ["Item", "Escrow"];
