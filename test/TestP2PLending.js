const P2PLending = artifacts.require('P2PLending');

const { expectRevert } = require('@openzeppelin/test-helpers');

var accounts;
var contractInstance;
var adminAccount;
var borrower1Account;
var borrower2Account;
var guarantor1Account;
var guarantor2Account;
var lender1Account;
var lender2Account;

contract('P2PLending', async (accs) => {
  accounts = accs;
  adminAccount = accounts[0];
  borrower1Account = accounts[1];
  borrower2Account = accounts[2];
  guarantor1Account = accounts[3];
  guarantor2Account = accounts[4];
  lender1Account = accounts[5];
  lender2Account = accounts[6];

  // contractInstance = await P2PLending.deployed();

  // contractInstance.setAdminAccount(adminAccount);
  // contractInstance.setBorrowersAccount(borrower1Account, borrower2Account);
  // contractInstance.setGuarantorsAccount(guarantor1Account, guarantor2Account);
  // contractInstance.setLendersAccount(lender1Account, lender2Account);
});

const initContract = async () => {
  console.log('Deploying contract and Setting up the accounts');
  contractInstance = await P2PLending.deployed();

  contractInstance.setAdminAccount(adminAccount);
  contractInstance.setBorrowersAccount(borrower1Account, borrower2Account);
  contractInstance.setGuarantorsAccount(guarantor1Account, guarantor2Account);
  contractInstance.setLendersAccount(lender1Account, lender2Account);
};

describe('Testing allowed functionality', async function () {
  describe('User Story 1: Borrower gets loan and Returns on time', async function () {
    before(async function () {
      await initContract();
    });
    it('has borrower1 successfully requested for loan', async () => {
      let loanAmount = 4;
      let paybackDate = 30;
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

    it('has guarantor1 successfully placed guarantee', async () => {
      let loanRequestAddress = borrower1Account;
      let guarantorInterestAmount = 1;

      let loanInfo = await contractInstance.getLoanRequestsForBorrower({
        from: borrower1Account,
      });
      let loanAmount = loanInfo.loanAmount;

      let oldAdminBalance = await contractInstance.balanceOf(adminAccount, {
        from: adminAccount,
      });

      let newAdminBalance;

      let placeGuaranteeResult = await contractInstance.placeGuarantee(
        loanRequestAddress,
        guarantorInterestAmount,
        {
          from: guarantor1Account,
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
          .add(
            web3.utils.toBN(web3.utils.toWei(loanAmount.toString(), 'ether'))
          )
          .toString()
      );
    });

    it('has borrower1 successfully accepted guarantee for loan', async () => {
      let result = await contractInstance.acceptGuarantee(borrower1Account, {
        from: borrower1Account,
      });
      // console.log(result);
      assert.equal(result.receipt.status, true);
      // assert.equal(await instance.name.call(), 'LoanToken');
    });

    it('has lender1 successfully lent money to borrower1', async () => {
      let loanRequestAddress = borrower1Account;
      let loanInfo = await contractInstance.getLoanRequestsForBorrower({
        from: borrower1Account,
      });
      let loanAmount = loanInfo.loanAmount;

      let oldBorrower1Balance = await contractInstance.balanceOf(
        borrower1Account,
        {
          from: borrower1Account,
        }
      );

      let newBorrower1Balance;

      let grantLoanResult = await contractInstance.grantLoan(
        loanRequestAddress,
        {
          from: lender1Account,
          value: web3.utils.toWei(loanAmount.toString(), 'ether'),
        }
      );

      newBorrower1Balance = await contractInstance.balanceOf(borrower1Account, {
        from: borrower1Account,
      });

      // console.log('oldAdminBalance: ', oldAdminBalance.toString());
      // console.log('newAdminBalance: ', newAdminBalance.toString());

      assert.equal(
        newBorrower1Balance.toString(),
        oldBorrower1Balance
          .add(
            web3.utils.toBN(web3.utils.toWei(loanAmount.toString(), 'ether'))
          )
          .toString()
      );
    });

    it('has borrower1 successfully returned money to smart contract', async () => {
      let loanRequestAddress = borrower1Account;
      let loanInfo = await contractInstance.getLoanRequestsForBorrower({
        from: borrower1Account,
      });
      let loanAmount = loanInfo.loanAmount;
      let paybackInterestAmount = loanInfo.paybackInterestAmount;

      let oldAdminBalance = await contractInstance.balanceOf(adminAccount, {
        from: adminAccount,
      });

      let newAdminBalance;
      // console.log('(loanAmount + paybackInterestAmount).toString()');
      // console.log('loanAmount: ', loanAmount);
      // console.log('paybackInterestAmount: ', paybackInterestAmount);
      // console.log(
      //   (parseInt(loanAmount) + parseInt(paybackInterestAmount)).toString()
      // );

      let paybackLoanResult = await contractInstance.paybackLoan(
        loanRequestAddress,
        {
          from: borrower1Account,
          value: web3.utils.toWei(
            (parseInt(loanAmount) + parseInt(paybackInterestAmount)).toString(),
            'ether'
          ),
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
          .add(
            web3.utils.toBN(
              web3.utils.toWei(
                (
                  parseInt(loanAmount) + parseInt(paybackInterestAmount)
                ).toString(),
                'ether'
              )
            )
          )
          .toString()
      );
    });
  });

  describe('User Story 2: Borrower gets loan but does not return on time', async function () {
    before(function () {
      initContract();
    });
    it('has borrower2 successfully requested for loan', async () => {
      let loanAmount = 4;
      let paybackDate = 1;
      let paybackInterestAmount = 2;

      let result = await contractInstance.requestLoan(
        loanAmount,
        paybackDate,
        paybackInterestAmount,
        { from: borrower2Account }
      );
      // console.log(result);
      assert.equal(result.receipt.status, true);
      // assert.equal(await instance.name.call(), 'LoanToken');
    });

    it('has guarantor1 successfully placed guarantee', async () => {
      let loanRequestAddress = borrower1Account;
      let guarantorInterestAmount = 1;

      let loanInfo = await contractInstance.getLoanRequestsForBorrower({
        from: borrower2Account,
      });
      let loanAmount = loanInfo.loanAmount;

      let oldAdminBalance = await contractInstance.balanceOf(adminAccount, {
        from: adminAccount,
      });

      let newAdminBalance;

      let placeGuaranteeResult = await contractInstance.placeGuarantee(
        loanRequestAddress,
        guarantorInterestAmount,
        {
          from: guarantor1Account,
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
          .add(
            web3.utils.toBN(web3.utils.toWei(loanAmount.toString(), 'ether'))
          )
          .toString()
      );
    });

    it('has borrower2 successfully accepted guarantee for loan', async () => {
      let result = await contractInstance.acceptGuarantee(borrower1Account, {
        from: borrower2Account,
      });
      // console.log(result);
      assert.equal(result.receipt.status, true);
      // assert.equal(await instance.name.call(), 'LoanToken');
    });

    it('has lender1 successfully lent money to borrower2', async () => {
      let loanRequestAddress = borrower2Account;
      let loanInfo = await contractInstance.getLoanRequestsForBorrower({
        from: borrower2Account,
      });
      let loanAmount = loanInfo.loanAmount;

      let oldBorrower2Balance = await contractInstance.balanceOf(
        borrower2Account,
        {
          from: borrower2Account,
        }
      );

      let newBorrower2Balance;

      let grantLoanResult = await contractInstance.grantLoan(
        loanRequestAddress,
        {
          from: lender1Account,
          value: web3.utils.toWei(loanAmount.toString(), 'ether'),
        }
      );

      newBorrower1Balance = await contractInstance.balanceOf(borrower2Account, {
        from: borrower2Account,
      });

      // console.log('oldAdminBalance: ', oldAdminBalance.toString());
      // console.log('newAdminBalance: ', newAdminBalance.toString());

      assert.equal(
        newBorrower2Balance.toString(),
        oldBorrower2Balance
          .add(
            web3.utils.toBN(web3.utils.toWei(loanAmount.toString(), 'ether'))
          )
          .toString()
      );
    });

    it('has payback time elapsed for borrower2', async () => {
      let loanInfo = await contractInstance.getLoanRequestsForBorrower({
        from: borrower2Account,
      });
      let paybackDate = loanInfo.paybackDate;
      console.log('paybackDate: ', paybackDate);
      // let days = 3;
      // var moreThanPaybackDateInMillisecs = 1000 * 3601 * days * 24;

      var moreThanPaybackDateInMillisecs =
        paybackDate * 1000 - new Date().getTime();

      console.log(
        'moreThanPaybackDateInMillisecs: ',
        moreThanPaybackDateInMillisecs
      );

      setTimeout(() => {
        currentTime = new Date().getTime();

        console.log('currentTime: ', currentTime);
        console.log('paybackTime: ', paybackDate * 1000);
        console.log(currentTime - parseInt(paybackDate) * 1000);
        assert.isAbove(
          currentTime,
          parseInt(paybackDate) * 1000,
          `${currentTime} is strictly greater than ${
            parseInt(paybackDate) * 1000
          }`
        );
      }, moreThanPaybackDateInMillisecs);
    });
    it('has lender1 successfully withdrew guarantee', async () => {});
  });

  describe('User Story 3: Borrower requests loan, guarantor places guarantee but borrower rejects guarantee', async function () {
    it('has borrower successfully requested for loan', async () => {});
    it('has guarantor successfully placed guarantee', async () => {});
    it('has borrower successfully rejected guarantee', async () => {});
  });
});

describe('Testing not allowed functionality', async function () {
  describe('User Story 0: Actors other than borrower(s) try to request for loan', async function () {
    before(function () {
      initContract();
    });
    it('has guarantor1 failed to request for loan', async () => {
      let loanAmount = 4;
      let paybackDate = 30;
      let paybackInterestAmount = 2;

      await expectRevert.unspecified(
        contractInstance.requestLoan(
          loanAmount,
          paybackDate,
          paybackInterestAmount,
          { from: guarantor1Account }
        )
      );
    });
    it('has lender1 failed to request for loan', async () => {
      let loanAmount = 4;
      let paybackDate = 30;
      let paybackInterestAmount = 2;

      await expectRevert.unspecified(
        contractInstance.requestLoan(
          loanAmount,
          paybackDate,
          paybackInterestAmount,
          { from: lender1Account }
        )
      );
    });
  });

  describe('User Story 1: Borrower requests loan but guarantor does not have enough balance', async function () {
    before(function () {
      initContract();
    });
    it('has borrower2 successfully requested for loan', async () => {
      let loanAmount = 10;
      let paybackDate = 30;
      let paybackInterestAmount = 2;

      let result = await contractInstance.requestLoan(
        loanAmount,
        paybackDate,
        paybackInterestAmount,
        { from: borrower2Account }
      );
      assert.equal(result.receipt.status, true);
    });
    it('has guarantee placing failed because guarantor did not send enough funds', async () => {
      let loanRequestAddress = borrower2Account;
      let guarantorInterestAmount = 1;

      let loanInfo = await contractInstance.getLoanRequestsForBorrower({
        from: borrower2Account,
      });
      let loanAmount = loanInfo.loanAmount;

      await expectRevert.unspecified(
        contractInstance.placeGuarantee(
          loanRequestAddress,
          guarantorInterestAmount,
          {
            from: guarantor1Account,
            value: web3.utils.toWei((loanAmount - 1).toString(), 'ether'),
          }
        )
      );
    });
  });

  describe('User Story 2: Borrower requests loan but previous request still pending', async function () {
    before(function () {
      initContract();
    });
    it('should not allow another request for loan (for same borrower) if previous request is not concluded', async () => {
      let loanAmount = 4;
      let paybackDate = 30;
      let paybackInterestAmount = 2;

      //first request
      // let reRequestLoanResult = await contractInstance.requestLoan(
      //   loanAmount,
      //   paybackDate,
      //   paybackInterestAmount,
      //   { from: borrower2Account }
      // );

      //second request without concluding the first (same borrower)
      await expectRevert.unspecified(
        contractInstance.requestLoan(
          loanAmount,
          paybackDate,
          paybackInterestAmount,
          { from: borrower2Account }
        )
      );
    });
  });
});
