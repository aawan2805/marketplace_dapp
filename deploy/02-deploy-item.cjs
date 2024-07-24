module.exports = async ({ getNamedAccounts, deployments }) => {
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    await deploy("Item", {
      contract: "Item",
      from: deployer,
      args: [], // The message value in the function constructor
      log: true, // Logs statements to console
    });
    await deploy("Escrow", {
        contract: "Escrow",
        from: deployer,
        args: [], // The message value in the function constructor
        log: true, // Logs statements to console
      });
  };
module.exports.tags = ["Item", "Escrow"];
