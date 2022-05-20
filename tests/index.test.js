const { ethers, waffle } = require('hardhat');
const chai = require('chai');

// chai.use(waffle.solidity); // used for testing emitted events

const { expect } = chai;

describe('MultiPay', async () => {
  let owner;
  let otherAccounts;
  let MultiPay;
  let multiPay;
  before(async () => {
    [owner, ...otherAccounts] = await ethers.getSigners();
    MultiPay = await ethers.getContractFactory('MultiPay');
  });
  beforeEach(async () => {
    multiPay = await MultiPay.deploy();
  });
  it('should spread native', async () => {
    const destinations = otherAccounts.slice(0, 10).map((wallet) => wallet.address);
    const balancesBeforePay = await Promise.all(destinations.map((address) => ethers.provider.getBalance(address)));
    const expectedBalances = balancesBeforePay.map((balance) => balance.add(ethers.utils.parseUnits('0.1', 18)));
    const transferAmount = ethers.utils.parseUnits('1', 18);
    await multiPay.connect(owner).spreadNative(destinations, { value: transferAmount });
    const balancesAfterPay = await Promise.all(destinations.map((address) => ethers.provider.getBalance(address)));
    for (let i = 0; i < balancesAfterPay.lengty; i++) {
      expect(balancesAfterPay[i]).to.equal(expectedBalances);
    }
  });
});
