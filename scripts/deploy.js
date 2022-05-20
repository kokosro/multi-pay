const hre = require('hardhat');

const config = require('../config');

const { ethers } = hre;

const sleep = (interval) => new Promise((resolve) => {
  setTimeout(resolve, interval);
});

const vanityDeploy = async ({
  deployer, owner, shouldContain, artifact, constructorBytes = undefined,
}) => {
  let saltNonce = -1;
  let found = false;
  const deployerAddress = deployer.address;

  const initCode = constructorBytes ? `${artifact.bytecode}${constructorBytes}`
    : artifact.bytecode;

  // console.log(initCode);
  const initCodeHash = ethers.utils.keccak256(initCode);

  //  let startB = Date.now();
  const start = Date.now();
  let expectedVanityAddress = null;
  let salt;
  while (!found) {
    saltNonce++;
    salt = ethers.utils.id(`${saltNonce}`);
    expectedVanityAddress = ethers.utils.getCreate2Address(deployerAddress, salt, initCodeHash);
    found = expectedVanityAddress.toLowerCase().includes(shouldContain, '');
  }

  const tx = await deployer.deployOwnable(initCode, salt, owner.address);
  await tx.wait();
  return { salt, address: expectedVanityAddress };
};

async function main() {
  await hre.run('compile');
  const [owner] = await ethers.getSigners();
  const Deployer = await ethers.getContractFactory('Deployer');
  const deployer = await Deployer.deploy();
  console.log(`deployer deployed @ ${deployer.address}`);
  const AdminProxy = await ethers.getContractFactory('AdminProxy');
  const adminProxyArtifact = await hre.artifacts.readArtifact('AdminProxy');
  const adminProxyAddressInfo = await vanityDeploy({
    deployer,
    owner,
    shouldContain: '0x1000',
    artifact: adminProxyArtifact,
    constructorBytes: undefined,
  });
  const adminProxyAddress = adminProxyAddressInfo.address;
  console.log(`admin deployed @ ${adminProxyAddress} with salt ${adminProxyAddressInfo.salt}`);

  const UpgradeableArtifact = await hre.artifacts.readArtifact('UpgradeableContract');

  const ImplementationArtifact = await hre.artifacts.readArtifact('MultiPay');

  const implementationAddressInfo = await vanityDeploy({
    deployer,
    owner,
    shouldContain: '0x',
    artifact: ImplementationArtifact,
  });
  console.log(`implementation deployed @ ${implementationAddressInfo.address} with salt ${implementationAddressInfo.salt}`);
  const implementation = new ethers.Contract(implementationAddressInfo.address, ImplementationArtifact.abi, owner);

  const implementationInitData = implementation.interface.encodeFunctionData('initialize()', []);
  const contractInfo = await vanityDeploy({
    deployer,
    owner,
    shouldContain: '0x',
    artifact: UpgradeableArtifact,
    constructorBytes: ethers.utils.defaultAbiCoder(
      ['address', 'address', 'bytes'],
      [
        implementationAddressInfo.address,
        adminProxyAddress.address,
        implementationInitData,
      ],
    ),
  });
  console.log(`multipay upgradeable contract deployed @ ${contractInfo.address} with salt ${contractInfo.salt}`);
}

main().then(() => {
  console.log('MIGRATIONS DONE');
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
