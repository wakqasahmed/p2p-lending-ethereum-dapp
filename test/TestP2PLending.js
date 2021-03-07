const P2PLending = artifacts.require('P2PLending');

var accounts;
var contractInstance;

contract('P2PLending', (accs) => {
  accounts = accs;
});

beforeEach('Setting up the accounts', async () => {
  console.log('beforeEach');
  contractInstance = await P2PLending.deployed();

  contractInstance.setAdminAccount(accounts[0]);
  contractInstance.setBorrowersAccount(accounts[1], accounts[2]);
  contractInstance.setGuarantorAccount(accounts[3]);
  contractInstance.setLenderAccount(accounts[4]);
});

it('has borrower successfully requested for loan', async () => {
  let loanAmount = 4;
  let paybackDate = 1;
  let paybackInterestAmount = 2;
  console.log('Account 1: ', accounts[1]);
  console.log(
    'Contract Instance Account 1: ',
    contractInstance.borrower1.call()
  );
  let result = await contractInstance.requestLoan(
    loanAmount,
    paybackDate,
    paybackInterestAmount,
    { from: accounts[1] }
  );
  // console.log(result);
  assert.equal(result.receipt.status, true);
  // assert.equal(await instance.name.call(), 'LoanToken');
});
