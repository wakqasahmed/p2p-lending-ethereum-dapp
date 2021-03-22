// https://eips.ethereum.org/EIPS/eip-20
// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LoanToken is ERC20 {

    constructor() public ERC20("LoanToken", "DFI") {
      _mint(msg.sender, 1000000); // 1 million
      _setupDecimals(0);
    }
    
}