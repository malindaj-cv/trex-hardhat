import { web3 } from "hardhat";
import fs from "fs";

async function main() {
    const envPath = "trex-fronted/.env.local";
    fs.writeFileSync(envPath, "", { flag: "w" });
    let claimTopicsRegistry;
    let identityRegistry;
    let identityRegistryStorage;
    let trustedIssuersRegistry;
    let claimIssuerContract;
    let token;
    let defaultCompliance;
    let tokenName;
    let tokenSymbol;
    let tokenDecimals;
    let tokenOnchainID;
    
    //connect to local blockchain
    web3.setProvider('http://localhost:8545');
    const accounts = await web3.eth.getAccounts();
    accounts.map((account, index) => {
        fs.writeFileSync(envPath, `ACCOUNT_${index}=${account}\r`, { flag: "a" });
    });

    //create signer key
    const signer = web3.eth.accounts.create();
    const signerKey = web3.utils.keccak256(web3.eth.abi.encodeParameter('address', signer.address));
    fs.writeFileSync(envPath, `SIGNER_KEY=${signerKey}\r`, { flag: "a" });

    const tokeny = accounts[0];
    fs.writeFileSync(envPath, `TOKENY=${tokeny}\r`, { flag: "a" });
    const claimIssuer = accounts[1];
    fs.writeFileSync(envPath, `CLAIM_ISSUER=${claimIssuer}\r`, { flag: "a" });
    const user1 = accounts[2];
    fs.writeFileSync(envPath, `USER1=${user1}\r`, { flag: "a" });
    const user2 = accounts[3];
    fs.writeFileSync(envPath, `USER2=${user2}\r`, { flag: "a" });
    const agent = accounts[4];
    fs.writeFileSync(envPath, `AGENT=${agent}\r`, { flag: "a" });
    const claimTopics = [1, 7, 3];
    let user1Contract;
    let user2Contract;

    claimTopicsRegistry = await new web3.eth.Contract( require('../artifacts/contracts/registry/ClaimTopicsRegistry.sol/ClaimTopicsRegistry.json').abi )
        .deploy({ data: require('../artifacts/contracts/registry/ClaimTopicsRegistry.sol/ClaimTopicsRegistry.json').bytecode, arguments: []})
        .send({ from: tokeny });
    await fs.writeFileSync(envPath, `CLAIM_TOPICS_REGISTRY=${claimTopicsRegistry.options.address}\r`, { flag: "a" });
    await console.log('ClaimTopicsRegistry deployed at: ', claimTopicsRegistry.options.address);

    trustedIssuersRegistry = await new web3.eth.Contract( require('../artifacts/contracts/registry/TrustedIssuersRegistry.sol/TrustedIssuersRegistry.json').abi )
        .deploy({ data: require('../artifacts/contracts/registry/TrustedIssuersRegistry.sol/TrustedIssuersRegistry.json').bytecode, arguments: []})
        .send({ from: tokeny });
    await fs.writeFileSync(envPath, `TRUSTED_ISSUERS_REGISTRY=${trustedIssuersRegistry.options.address}\r`, { flag: "a" });
    await console.log('TrustedIssuersRegistry deployed at: ', trustedIssuersRegistry.options.address);

    identityRegistryStorage = await new web3.eth.Contract( require('../artifacts/contracts/registry/IdentityRegistryStorage.sol/IdentityRegistryStorage.json').abi )
        .deploy({ data: require('../artifacts/contracts/registry/IdentityRegistryStorage.sol/IdentityRegistryStorage.json').bytecode, arguments: []})
        .send({ from: tokeny });
    await fs.writeFileSync(envPath, `IDENTITY_REGISTRY_STORAGE=${identityRegistryStorage.options.address}\r`, { flag: "a" });
    await console.log('IdentityRegistryStorage deployed at: ', identityRegistryStorage.options.address);

    defaultCompliance = await new web3.eth.Contract( require('../artifacts/contracts/compliance/DefaultCompliance.sol/DefaultCompliance.json').abi )
        .deploy({ data: require('../artifacts/contracts/compliance/DefaultCompliance.sol/DefaultCompliance.json').bytecode, arguments: []})
        .send({ from: tokeny });
    await fs.writeFileSync(envPath, `DEFAULT_COMPLIANCE=${defaultCompliance.options.address}\r`, { flag: "a" });
    await console.log('DefaultCompliance deployed at: ', defaultCompliance.options.address);

    identityRegistry = await new web3.eth.Contract( require('../artifacts/contracts/registry/IdentityRegistry.sol/IdentityRegistry.json').abi )
        .deploy({ data: require('../artifacts/contracts/registry/IdentityRegistry.sol/IdentityRegistry.json').bytecode, arguments: [trustedIssuersRegistry.options.address, claimTopicsRegistry.options.address, identityRegistryStorage.options.address]})
        .send({ from: tokeny });
    await fs.writeFileSync(envPath, `IDENTITY_REGISTRY=${identityRegistry.options.address}\r`, { flag: "a" });
    await console.log('IdentityRegistry deployed at: ', identityRegistry.options.address);

    tokenOnchainID = await new web3.eth.Contract( require('../artifacts/contracts/OID/Identity.sol/Identity.json').abi )
        .deploy({ data: require('../artifacts/contracts/OID/Identity.sol/Identity.json').bytecode, arguments: [tokeny,false]})
        .send({ from: tokeny });
    await fs.writeFileSync(envPath, `TOKEN_ONCHAIN_ID=${tokenOnchainID.options.address}\r`, { flag: "a" });

    tokenName = 'TREXDINO';
    tokenSymbol = 'TREX';
    tokenDecimals = '0';
    token = await new web3.eth.Contract( require('../artifacts/contracts/token/Token.sol/Token.json').abi )
        .deploy({ data: require('../artifacts/contracts/token/Token.sol/Token.json').bytecode, arguments: []})
        .send({ from: tokeny });
    await token.methods.init(identityRegistry.options.address, defaultCompliance.options.address, tokenName, tokenSymbol, tokenDecimals, tokenOnchainID.options.address, )
        .send({ from: tokeny });

    const implementation = await new web3.eth.Contract( require('../artifacts/contracts/proxy/ImplementationAuthority.sol/ImplementationAuthority.json').abi )
        .deploy({ data: require('../artifacts/contracts/proxy/ImplementationAuthority.sol/ImplementationAuthority.json').bytecode, arguments: [token.options.address]})
        .send({ from: tokeny });
    await fs.writeFileSync(envPath, `IMPLEMENTATION_AUTHORITY=${implementation.options.address}\r`, { flag: "a" });
    await console.log('ImplementationAuthority deployed at: ', implementation.options.address);

    const proxy = await new web3.eth.Contract( require('../artifacts/contracts/proxy/TokenProxy.sol/TokenProxy.json').abi )
        .deploy({ data: require('../artifacts/contracts/proxy/TokenProxy.sol/TokenProxy.json').bytecode, arguments: [
            implementation.options.address,
            identityRegistry.options.address,
            defaultCompliance.options.address,
            tokenName,
            tokenSymbol,
            tokenDecimals,
            tokenOnchainID.options.address,
        ]})
        .send({ from: tokeny });
    await fs.writeFileSync(envPath, `TOKEN_PROXY=${proxy.options.address}\r`, { flag: "a" });
    await console.log('TokenProxy deployed at: ', proxy.options.address);

    token = await new web3.eth.Contract( require('../artifacts/contracts/token/Token.sol/Token.json').abi, proxy.options.address);
    await fs.writeFileSync(envPath, `TOKEN=${token.options.address}\r`, { flag: "a" });
    await console.log('Token deployed at: ', token.options.address);

    await identityRegistryStorage.methods.bindIdentityRegistry(identityRegistry.options.address).send({ from: tokeny });
    await token.methods.addAgentOnTokenContract(agent).send({ from: tokeny });

    await claimTopicsRegistry.methods.addClaimTopic(7).send({ from: tokeny });

    claimIssuerContract = await new web3.eth.Contract( require('../artifacts/contracts/OID/ClaimIssuer.sol/ClaimIssuer.json').abi )
        .deploy({ data: require('../artifacts/contracts/OID/ClaimIssuer.sol/ClaimIssuer.json').bytecode, arguments: [claimIssuer]})
        .send({ from: claimIssuer });
    await fs.writeFileSync(envPath, `CLAIM_ISSUER=${claimIssuerContract.options.address}\r`, { flag: "a" });
    await console.log('ClaimIssuer deployed at: ', claimIssuerContract.options.address);

    await claimIssuerContract.methods.addKey(signerKey, 3, 1).send({ from: claimIssuer });

    await trustedIssuersRegistry.methods.addTrustedIssuer(claimIssuerContract.options.address, claimTopics).send({ from: tokeny });

    user1Contract = await new web3.eth.Contract( require('../artifacts/contracts/OID/Identity.sol/Identity.json').abi )
        .deploy({ data: require('../artifacts/contracts/OID/Identity.sol/Identity.json').bytecode, arguments: [user1,false]})
        .send({ from: user1 });
    await fs.writeFileSync(envPath, `USER1_IDENTITY=${user1Contract.options.address}\r`, { flag: "a" });
    await console.log('User1 deployed at: ', user1Contract.options.address);

    user2Contract = await new web3.eth.Contract( require('../artifacts/contracts/OID/Identity.sol/Identity.json').abi )
        .deploy({ data: require('../artifacts/contracts/OID/Identity.sol/Identity.json').bytecode, arguments: [user2,false]})
        .send({ from: user2 });
    await fs.writeFileSync(envPath, `USER2_IDENTITY=${user2Contract.options.address}\r`, { flag: "a" });
    console.log('User2 deployed at: ', user2Contract.options.address);

    await identityRegistry.methods.addAgentOnIdentityRegistryContract(agent).send({ from: tokeny });
    await identityRegistry.methods.registerIdentity(user1, user1Contract.options.address, 91).send({ from: agent });
    await identityRegistry.methods.registerIdentity(user2, user2Contract.options.address, 101).send({ from: agent });

    // user1 gets signature from claim issuer
    const hexedData1 = await web3.utils.asciiToHex('Yea no, this guy is totes legit');
    const hashedDataToSign1 = web3.utils.keccak256(
      web3.eth.abi.encodeParameters(['address', 'uint256', 'bytes'], [user1Contract.options.address, 7, hexedData1]),
    );

    const signature1 = (await signer.sign(hashedDataToSign1)).signature;
    await user1Contract.methods.addClaim(7, 1, claimIssuerContract.options.address, signature1, hexedData1, '').send({ from: user1 });

    // user2 gets signature from claim issuer
    const hexedData2 = await web3.utils.asciiToHex('Yea no, this guy is totes legit');
    const hashedDataToSign2 = web3.utils.keccak256(
        web3.eth.abi.encodeParameters(['address', 'uint256', 'bytes'], [user2Contract.options.address, 7, hexedData2]),
    );

    const signature2 = (await signer.sign(hashedDataToSign2)).signature;
    await user2Contract.methods.addClaim(7, 1, claimIssuerContract.options.address, signature2, hexedData2, '').send({ from: user2 });

    await token.methods.mint(user1, 1000).send({ from: agent });
    await token.methods.mint(user2, 100).send({ from: agent });

    await token.methods.transfer(user2, 500).send({ from: user1 });
    await token.methods.transfer(user1, 150).send({ from: user2 });
    
    //get balance of user1
    const balance1 = await token.methods.balanceOf(user1).call();
    console.log('Balance of user1: ', balance1);

    //get balance of user2
    const balance2 = await token.methods.balanceOf(user2).call();
    console.log('Balance of user2: ', balance2);

    //get total supply
    const totalSupply = await token.methods.totalSupply().call();
    console.log('Total supply: ', totalSupply);

    //get token name
    const name = await token.methods.name().call();
    console.log('Token name: ', name);

    //get token symbol
    const symbol = await token.methods.symbol().call();
    console.log('Token symbol: ', symbol);

    //get token decimals
    const decimals = await token.methods.decimals().call();
    console.log('Token decimals: ', decimals);

    //get token onchainID
    const onchainID = await token.methods.onchainID().call();
    console.log('Token onchainID: ', onchainID);

    //get token compliance
    const compliance = await token.methods.compliance().call();
    console.log('Token compliance: ', compliance);

    //get token identityRegistry
    const identityRegistryAddress = await token.methods.identityRegistry().call();
    console.log('Token identityRegistry: ', identityRegistryAddress);

    //get token owner
    const owner = await token.methods.owner().call();
    console.log('Token owner: ', owner);

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});