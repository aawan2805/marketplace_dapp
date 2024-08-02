module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  // Deploy Item contract
  await deploy("Item", {
    contract: "Item",
    from: deployer,
    args: [], // No constructor arguments required
    log: true,
  });
};

module.exports.tags = ["Item"];
