const TokenFactory = artifacts.require('TokenFactory');

module.exports = function deployTokenFactory(deployer) {
  deployer.deploy(TokenFactory);
};
