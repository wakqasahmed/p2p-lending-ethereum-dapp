const P2PLending = artifacts.require('P2PLending');
const LoanToken = artifacts.require('LoanToken');

module.exports = function (deployer) {
  deployer.deploy(P2PLending);
  deployer.deploy(LoanToken);
};
