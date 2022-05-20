require('dotenv').config();
const convict = require('convict');
const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');

const lowerCaseString = {
  name: 'lowercase-string',
  validate: (val) => true,
  coerce: (val) => val.toLowerCase(),
};

const accountsFromMnemonic = {
  name: 'accounts-from-mnemonic',
  validate: (val) => true,
  coerce: (val) => {
    const mnemonic = !val ? ethers.Wallet.createRandom().mnemonic.phrase : val;

    const addressesKeys = [];
    const ACCOUNTS_COUNT = parseInt(process.env.ACCOUNTS_COUNT || 100, 10);
    for (let i = 0; i < ACCOUNTS_COUNT; i++) {
      const wallet = ethers.Wallet.fromMnemonic(mnemonic, `m/44'/60'/0'/0/${i}`);

      addressesKeys.push(`${wallet.privateKey}`);
    }

    return addressesKeys.filter((x) => !!x);
  },
};

convict.addFormat(lowerCaseString);
convict.addFormat(accountsFromMnemonic);

const config = convict({
  network: {
    name: {
      format: 'lowercase-string',
      default: 'development',
      env: 'NETWORK',
    },
    providerHttp: {
      format: String,
      default: 'http://localhost:8545',
      env: 'PROVIDER_HTTP',
    },
    mnemonic: {
      format: String,
      default: 'ride move coyote bird bulb rate rally library goat height artefact lion',
      env: 'ACCOUNT_MNEMONIC',
    },
    accounts: {
      format: 'accounts-from-mnemonic',
      default: 'ride move coyote bird bulb rate rally library goat height artefact lion',
      env: 'ACCOUNT_MNEMONIC',
    },
    providerHttpHardhat: {
      format: String,
      default: 'http://localhost:8545',
      env: 'PROVIDER_HTTP_TEST',
    },
    hardhatTestBlock: {
      format: String,
      default: '0',
      env: 'TEST_BLOCK',
    },
  },
  etherscan: {
    apiKey: {
      format: String,
      default: 'none',
      env: 'ETHERSCAN_API_KEY',
    },
  },
  gasPrice: {
    maxGasPrice: {
      format: String,
      default: '3000000000000000',
      env: 'MAX_GAS_PRICE',

    },
    maxPriorityFeePerGas: {
      format: String,
      default: '3000000000000000',
      env: 'MAX_PRIORITY_FEE_PER_GAS',
    },
  },
});

config.validate({ allowed: 'strict' });

config.isHardhat = () => config.get('network.name') == 'hardhat';

module.exports = config;
