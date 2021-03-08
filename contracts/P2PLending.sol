// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.8.0;
pragma experimental ABIEncoderV2;

// Import Auth contract from the current directory
// import "./Auth.sol";

// TODO:
// * Add loanId field
// * Register borrowers, lenders and guarantors dynamically

interface ILendingRequest {
    function requestLoan(uint _loanAmount, uint _paybackDate, uint _paybackInterestAmount) external returns (bool);
    function placeGuarantee(address loanRequestAddress, uint _guarantorInterestAmount) external payable returns (bool);
    function acceptGuarantee(address loanRequestAddress) external;
    function rejectGuarantee(address loanRequestAddress) external;
    function grantLoan(address loanRequestAddress) external payable returns (bool);    
    function withdrawGuarantee(address loanRequestAddress) external returns (bool);    
    function paybackLoan(address loanRequestAddress) external payable returns (bool);    
    function withdrawGuarantor() external returns (bool);
    function withdrawLender() external returns (bool);        
}

contract P2PLending is ILendingRequest {
// Actors
//    1) Borrower/Maker (Originator) 
//    2) Guarantor
//    3) Lender/Holder

// Assumptions:
// 1) Loan can not be granted without guarantee.
// 2) Borrower can only request one loan at a time (i.e. existing request must reach end state).

// Implementation Notes:
// 1) Address of the borrower is used as a loanId for simplification. 
//TODO: indexed loanId could be used to detach loan request from address, to allow an address to be a borrower, lender and/or guarantor at the same time.

//     Auth private auth;

// constructor(Auth _auth) public {
//         auth = _auth;
//     }

    enum TransactionStates {
        LoanRequested, //initialstate, by borrower
        GuaranteePlaced, //by guarantor        
        GuaranteeAccepted, //by borrower (after the guarantee was placed)
        GuaranteeRejected, //endstate, by borrower (after the guarantee was placed)
        LoanGranted, //by lender (in case the guarantee was accepted by borrower)
        LoanReturned, //endstate, by borrower (along with interest for guarantor + lender)
        GuaranteeWithdrawn //endstate, by lender (the same amount as requested by the borrower initially)
    }

  struct loanRequestStruct {
    TransactionStates loanState;
    uint loanAmount;     // loanAmount in ether e.g. 4 ether
    uint paybackDate;    // payback promise date
    uint paybackInterestAmount;    //payback promise interest amount in 2 ether
    uint guarantorInterestAmount;    // To be specified by guarantor e.g. 1 ether
    uint lenderInterestAmount;    // To be calculated (paybackInterestAmount - guarantorInterestAmount)
    address borrower;
    address guarantor;
    address lender;
  }

  // variables    
  address payable public admin;  
  address payable public borrower1;
  address payable public borrower2;
  address payable public guarantor;
  address payable public lender;
  
  // using withdrawal pattern
  mapping (address => uint) pendingGuarantorWithdrawals;
  mapping (address => uint) pendingLenderWithdrawals;

  mapping(address => loanRequestStruct) loanRequestMapping;
  loanRequestStruct[] loanRequestsGuarantorView;    
  loanRequestStruct[] loanRequestsLenderView;    
  address[] allLoanRequests;

    function setAdminAccount(address payable _adminAcc) public {
        admin = _adminAcc;
    }

    function setBorrowersAccount(address payable _borrower1Acc, address payable _borrower2Acc) public {
        borrower1 = _borrower1Acc;
        borrower2 = _borrower2Acc;
    }    

    function setGuarantorAccount(address payable _guarantorAcc) public {
        guarantor = _guarantorAcc;
    }

    function setLenderAccount(address payable _lenderAcc) public {
        lender = _lenderAcc;
    }    


    function getLoanRequestsForBorrower() public view returns (loanRequestStruct memory) {    
        require (msg.sender == borrower1 || msg.sender == borrower2, "Invalid action, you are not registered as a borrower.");        
        
        return loanRequestMapping[msg.sender];
    }    

    function getLoanRequestsForGuarantor() public returns (loanRequestStruct[] memory) {    
        require (msg.sender == guarantor, "Invalid action, you are not registered as a guarantor.");        
        
        //return requests where either msg.sender is guarantor OR loanState is LoanRequested
        
        //Counterintuitive for gas and scalability, find a way to not iterate over
        for (uint l = 0; l < allLoanRequests.length; l++) {
            if(msg.sender == allLoanRequests[l] || loanRequestMapping[allLoanRequests[l]].loanState == TransactionStates.LoanRequested){
                loanRequestsGuarantorView.push(loanRequestMapping[allLoanRequests[l]]);                 
            }
        }        
        
        return loanRequestsGuarantorView;
    }    

    function getLoanRequestsForLender() public returns (loanRequestStruct[] memory) {    
        require (msg.sender == lender, "Invalid action, you are not registered as a lender.");        

        //return requests where either msg.sender is lender OR loanState is LoanRequested or GuaranteePlaced        
        //Counterintuitive for gas and scalability, find a way to not iterate over and not changing state, making it just a view
        for (uint l = 0; l < allLoanRequests.length; l++) {
            if(msg.sender == allLoanRequests[l] || loanRequestMapping[allLoanRequests[l]].loanState == TransactionStates.GuaranteePlaced){
                loanRequestsLenderView.push(loanRequestMapping[allLoanRequests[l]]);                 
            }
        }        
        
        return loanRequestsLenderView;
    }    

    function requestLoan (uint _loanAmount, uint _paybackDate, uint _paybackInterestAmount) override external returns (bool){
        require(loanRequestMapping[msg.sender].borrower != msg.sender, "Pending request exists. Either cancel it or wait for it to proceed.");
        require (msg.sender == borrower1 || msg.sender == borrower2, "Invalid action, you are not registered as a borrower.");
        require (_loanAmount > _paybackInterestAmount, "Invalid input (paybackInterestAmount), do you really want to pay interest more than the loan amount?");
        require (_paybackInterestAmount > 0, "Invalid input (paybackInterestAmount), why do you think someone will lend you money without any interest?");
        // require (_paybackDate > block.timestamp, "Invalid input (paybackDate), do you have a timemachine to payback going into the past?");
        
        // loanRequestStruct storage loanReq = loanRequestMapping[msg.sender];
        // loanReq.loanAmount = _loanAmount;
        // loanReq.paybackDate = _paybackDate;
        // loanReq.paybackInterestAmount = _paybackInterestAmount;
        // loanReq.guarantorInterestAmount = 0;
        // loanReq.lenderInterestAmount = 0;
        // loanReq.borrower = msg.sender;
        // loanReq.guarantor = address(0x0);
        // loanReq.lender = address(0x0);

        loanRequestMapping[msg.sender] = loanRequestStruct(
                TransactionStates.LoanRequested,
                _loanAmount,
                _paybackDate,
                _paybackInterestAmount,
                0,
                0,
                msg.sender,
                address(0x0),
                address(0x0)
            );

        allLoanRequests.push(msg.sender);
        return true;
    }

    function placeGuarantee(address loanRequestAddress, uint _guarantorInterestAmount) override external payable returns (bool) {
        // Validate the user is supposedly registered as the guarantor
        require (msg.sender == guarantor, "Invalid action, you are not registered as a guarantor.");

        //Loan request is in its initial state - LoanRequested
        require(loanRequestMapping[loanRequestAddress].loanState == TransactionStates.LoanRequested, "Invalid action, guarantee cannot be placed at this state.");         
        
        //Guarantee is not placed already
        // require(loanRequestMapping[loanRequestAddress].TransactionStates != TransactionStates.GuaranteePlaced, "Guarantee already exists."); 
        
        //Guarantee interest amount too high >= paybackInterestAmount
        require(loanRequestMapping[loanRequestAddress].paybackInterestAmount > _guarantorInterestAmount, "Invalid input (guarantorInterestAmount). Don't be so selfish, leave some profit for lender.");

        //payback time has already passed
        //require(block.timestamp > loanRequestMapping[loanRequestAddress].paybackDate, "Invalid action. Loan paybackDate has already passed.");

        //guarantor has passed guarantee value equivalent of loanAmount
        require(msg.value == loanRequestMapping[loanRequestAddress].loanAmount * (1 ether), "Insufficient funds. Funds are not equal to the Loan amount.");        

        admin.transfer(msg.value);
        
        loanRequestMapping[loanRequestAddress].guarantorInterestAmount = _guarantorInterestAmount;
        loanRequestMapping[loanRequestAddress].lenderInterestAmount = loanRequestMapping[loanRequestAddress].paybackInterestAmount - _guarantorInterestAmount;
        loanRequestMapping[loanRequestAddress].guarantor = msg.sender;
        loanRequestMapping[loanRequestAddress].loanState = TransactionStates.GuaranteePlaced;
    }
    
    function acceptGuarantee(address loanRequestAddress) override external {
        require (msg.sender == borrower1 || msg.sender == borrower2, "Invalid action, you are not registered as a borrower.");

        //Sender is the loan requeter?
        require(loanRequestMapping[loanRequestAddress].borrower == msg.sender, "Invalid action, did you really raise this loan request?");                 
        
        //Loan request is in appropriate state - GuaranteePlaced
        require(loanRequestMapping[loanRequestAddress].loanState == TransactionStates.GuaranteePlaced, "Invalid action, guarantee cannot be accepted at this state.");                 
        
        loanRequestMapping[loanRequestAddress].loanState = TransactionStates.GuaranteeAccepted;
    }
    
    function rejectGuarantee(address loanRequestAddress) override external {
        require (msg.sender == borrower1 || msg.sender == borrower2, "Invalid action, you are not registered as a borrower.");

        //Sender is the loan requeter?
        require(loanRequestMapping[loanRequestAddress].borrower == msg.sender, "Invalid action, did you really raise this loan request?");                 
        
        //Loan request is in appropriate state - GuaranteePlaced
        require(loanRequestMapping[loanRequestAddress].loanState == TransactionStates.GuaranteePlaced, "Invalid action, guarantee cannot be rejected at this state.");                 
        
        loanRequestMapping[loanRequestAddress].loanState = TransactionStates.GuaranteeRejected;                        
    }    

    function grantLoan(address loanRequestAddress) override external payable returns (bool) {
        // Validate the user is supposedly registered as the guarantor
        require (msg.sender == lender, "Invalid action, you are not registered as a lender.");

        //Loan request is in the state - GuaranteeAccepted
        require(loanRequestMapping[loanRequestAddress].loanState == TransactionStates.GuaranteeAccepted, "Invalid action, loan cannot be granted at this state.");         
        
        //Loan is not granted already
        // require(loanRequestMapping[loanRequestAddress].TransactionStates != TransactionStates.GuaranteeAccepted, "Loan already granted."); 

        //lender has passed value equivalent of loanAmount
        require(msg.value == loanRequestMapping[loanRequestAddress].loanAmount * (1 ether), "Insufficient funds. Funds are not equal to the Loan amount.");        
        
        loanRequestMapping[loanRequestAddress].lender = msg.sender;
        loanRequestMapping[loanRequestAddress].loanState = TransactionStates.LoanGranted;

        //External call in the end, to minimize reentrancy bug
        if(loanRequestAddress == borrower1){
            borrower1.transfer(msg.value);
        } else {
            borrower2.transfer(msg.value);            
        }        
    }

    function withdrawGuarantee(address loanRequestAddress) override external returns (bool) {
        // Validate the user is supposedly registered as the lender
        require (msg.sender == lender, "Invalid action, you are not registered as a lender.");

        //msg.sender is the same lender who lent the money?
        require(loanRequestMapping[loanRequestAddress].lender == msg.sender, "Invalid action, did you really granted this loan request?");                 

        //Loan request is in the state - LoanGranted
        require(loanRequestMapping[loanRequestAddress].loanState == TransactionStates.LoanGranted, "Invalid action, guarantee cannot be withdrawn at this state.");         

        //payback time has elapsed?
        require (block.timestamp > loanRequestMapping[loanRequestAddress].paybackDate, "Invalid action, borrower still have time to payback as per the agreement.");        

        pendingLenderWithdrawals[loanRequestMapping[loanRequestAddress].lender] += 
            loanRequestMapping[loanRequestAddress].loanAmount;
        
        loanRequestMapping[loanRequestAddress].loanState = TransactionStates.GuaranteeWithdrawn;        
    }
    
    function paybackLoan(address loanRequestAddress) override external payable returns (bool) {
        // Validate the user is supposedly registered as the borrower
        require (msg.sender == borrower1 || msg.sender == borrower2, "Invalid action, you are not registered as a borrower.");

        //msg.sender is the loan requeter?
        require(loanRequestMapping[loanRequestAddress].borrower == msg.sender, "Invalid action, did you really raise this loan request?");                 

        //Loan request is in the state - LoanGranted
        require(loanRequestMapping[loanRequestAddress].loanState == TransactionStates.LoanGranted, "Invalid action, loan cannot be payback at this state.");         

        //borrower has passed value equivalent of loanAmount + paybackInterestAmount
        require(msg.value == loanRequestMapping[loanRequestAddress].loanAmount * (1 ether) + loanRequestMapping[loanRequestAddress].paybackInterestAmount * (1 ether), "Insufficient funds. Funds are not equal to the Loan amount + paybackInterest Amount.");        

        admin.transfer(msg.value);
        
        pendingGuarantorWithdrawals[loanRequestMapping[loanRequestAddress].guarantor] += 
            loanRequestMapping[loanRequestAddress].loanAmount + loanRequestMapping[loanRequestAddress].guarantorInterestAmount;

        pendingLenderWithdrawals[loanRequestMapping[loanRequestAddress].lender] += 
            loanRequestMapping[loanRequestAddress].loanAmount + loanRequestMapping[loanRequestAddress].lenderInterestAmount;
        
        loanRequestMapping[loanRequestAddress].loanState = TransactionStates.LoanReturned;        
    }    

    //withdrawal pattern to protect from security threat
    function withdrawGuarantor() override external returns (bool) {
      uint amount = pendingGuarantorWithdrawals[msg.sender];        
        
      //smart contract has sufficient funds
      require (admin.balance >= amount, "Insufficient funds, RED FLAG, smart contract has run out of money.");        
        
      pendingGuarantorWithdrawals[msg.sender] = 0;

      //External call in the end, to minimize reentrancy bug
      msg.sender.transfer(amount);       
      return true;
    }

    //withdrawal pattern to protect from security threat
    function withdrawLender() override external returns (bool) {
      uint amount = pendingLenderWithdrawals[msg.sender];
      
      //smart contract has sufficient funds
      require (admin.balance >= amount, "Insufficient funds, RED FLAG, smart contract has run out of money.");              
      
      pendingLenderWithdrawals[msg.sender] = 0;

      //External call in the end, to minimize reentrancy bug      
      msg.sender.transfer(amount);               
      return true;
    }

    function getLoanRequestsCount( 
    ) view public returns (uint) { 
        return allLoanRequests.length; 
    }

    /// @notice Get balance
    /// @return The balance of the address
    // allows function to run locally/off blockchain
    function balanceOf(address account) public view returns (uint) {
        /* Get the balance of the account of this transaction */
        return address(account).balance;
    }

    // Fallback function - Called if other functions don't match call or
    // sent ether without data
    // Typically, called when invalid data is sent
    // Added so ether sent to this contract is reverted if the contract fails
    // otherwise, the sender's money is transferred to contract
    // function() external {
    //     revert("Oops! Something went wrong.");
    // }    
}