const P2PLending = artifacts.require('P2PLending');

var accounts;
var contractInstance;
var adminAccount;
var borrower1Account;
var borrower2Account;
var guarantorAccount;
var lenderAccount;

contract('P2PLending', (accs) => {
  accounts = accs;
  adminAccount = accounts[0];
  borrower1Account = accounts[1];
  borrower2Account = accounts[2];
  guarantorAccount = accounts[3];
  lenderAccount = accounts[4];
});

beforeEach('Setting up the accounts', async () => {
  console.log('beforeEach');
  contractInstance = await P2PLending.deployed();

  contractInstance.setAdminAccount(adminAccount);
  contractInstance.setBorrowersAccount(borrower1Account, borrower2Account);
  contractInstance.setGuarantorAccount(guarantorAccount);
  contractInstance.setLenderAccount(lenderAccount);
});

it('has borrower successfully requested for loan', async () => {
  let loanAmount = 4;
  let paybackDate = 1;
  let paybackInterestAmount = 2;

  let result = await contractInstance.requestLoan(
    loanAmount,
    paybackDate,
    paybackInterestAmount,
    { from: borrower1Account }
  );
  // console.log(result);
  assert.equal(result.receipt.status, true);
  // assert.equal(await instance.name.call(), 'LoanToken');
});

/*
it('should not allow another request for loan if previous request is not concluded', async () => {
  let loanAmount = 4;
  let paybackDate = 1;
  let paybackInterestAmount = 2;

  let reRequestLoanResult = await contractInstance.requestLoan(
    loanAmount,
    paybackDate,
    paybackInterestAmount,
    { from: borrower1Account }
  );

  console.log('reRequestLoanResult');
  console.log(reRequestLoanResult);
  //assert.equal(reRequestLoanResult.receipt.status, true);
});
*/

it('has guarantor successfully placed guarantee', async () => {
  let loanRequestAddress = borrower1Account;
  let guarantorInterestAmount = 1;

  let loanAmount = 4;
  let paybackDate = 1;
  let paybackInterestAmount = 2;

  let oldAdminBalance = await contractInstance.balanceOf(adminAccount, {
    from: adminAccount,
  });

  let newAdminBalance;

  let placeGuaranteeResult = await contractInstance.placeGuarantee(
    loanRequestAddress,
    guarantorInterestAmount,
    {
      from: guarantorAccount,
      value: web3.utils.toWei(loanAmount.toString(), 'ether'),
    }
  );

  newAdminBalance = await contractInstance.balanceOf(adminAccount, {
    from: adminAccount,
  });

  // console.log('oldAdminBalance: ', oldAdminBalance.toString());
  // console.log('newAdminBalance: ', newAdminBalance.toString());

  assert.equal(
    newAdminBalance.toString(),
    oldAdminBalance
      .add(web3.utils.toBN(web3.utils.toWei(loanAmount.toString(), 'ether')))
      .toString()
  );
});
