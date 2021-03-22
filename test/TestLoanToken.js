const LoanToken = artifacts.require('LoanToken');

// var accounts;
// var owner;

// contract('LoanToken', (accs) => {
//     accounts = accs;
//     owner = accounts[0];
// });

describe('Testing LoanToken allowed functionality', async function () {
  it('has token with the right name', async () => {
    let instance = await LoanToken.deployed();
    assert.equal(await instance.name.call(), 'LoanToken');
  });

  it('has token with the right symbol', async () => {
    let instance = await LoanToken.deployed();
    assert.equal(await instance.symbol.call(), 'DFI');
  });

  it('has token with the right # of decimals', async () => {
    let instance = await LoanToken.deployed();
    assert.equal(await instance.decimals.call(), 0);
  });

  it('has token with the right total supply via mint', async () => {
    let instance = await LoanToken.deployed();
    assert.equal(await instance.totalSupply.call(), 1000000);
  });
});
