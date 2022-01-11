const BOG = artifacts.require("BOG");

module.exports = function (deployer) {
  deployer.deploy(BOG, "https://ipfs.io/ipfs/NewUriToReplace/");
};
