const bog = artifacts.require("bog");
const truffleAssert = require('truffle-assertions');
require('dotenv').config();
const Account = require('eth-lib/lib/account');
const ethereumjsUtil = require('ethereumjs-util');
const BN = require('bn.js');

/*
 * uncomment accounts to access the test accounts made available by the
 * Ethereum client
 * See docs: https://www.trufflesuite.com/docs/truffle/testing/writing-tests-in-javascript
 */
contract("bog", function (accounts) {
  console.log(accounts);
  let bogContract;
  beforeEach('should setup the contract interface', async() => {
    bogContract = await bog.deployed();
  });

  describe('Contract Name and Symbol check', function(){
    it("should return bog as contract name", async function (){
      const name = await bogContract.name();
      assert.equal(name, 'Babies of Gods');
    });

    it("should return bogNFT as contract symbol", async function (){
      const symbol = await bogContract.symbol();
      assert.equal(symbol, 'BOG');
    });
  });

  describe('Contract Owner check', function(){
    it("should return owner address as first account address", async function(){
      const owner = await bogContract.owner();
      assert.equal(owner, accounts[0]);
    })
  })

  describe('setPause function check', function(){
    it("should fail with non-owner account", async function () {
      await truffleAssert.reverts(bogContract.setPause(false, {'from': accounts[1]}));
    })

    it("should return pause event", async function () {
      const result = await bogContract.setPause(false, {'from': accounts[0]});
      truffleAssert.eventEmitted(result, 'PauseEvent', (event) => {
        return event.pause == false;
      });
    });
  });

  describe('setPrice function check', function(){
    it("should fail with non-owner account", async function () {
      await truffleAssert.reverts(bogContract.setPrice(web3.utils.toWei('0.19', 'ether'), {'from': accounts[1]}));
    })

    it("should return newPrice event", async function () {
      const result = await bogContract.setPrice(web3.utils.toWei('0.19', 'ether'), {'from': accounts[0]});
      truffleAssert.eventEmitted(result, 'NewPriceEvent', (event) => {
        return event.price == web3.utils.toWei('0.19', 'ether');
      });
    });
  });

  describe('mint function check', function(){
    // Test mint datas
    const tokenAmount = 3;
    const timestamp = parseInt(new Date().getTime() / 1000);
    const minterAddress = accounts[1];
    
    it("should mint with correct signature", async function () {
      const price = await bogContract.price(tokenAmount);
      
      // Data Pack
      const data = web3.eth.abi.encodeParameters(
        ['address', 'uint256', 'uint256'],
        [minterAddress, tokenAmount, timestamp]
      );
      
      // Signature Generate
      const messageHex = web3.utils.isHexStrict(data) ? data : web3.utils.utf8ToHex(data);
      const messageBytes = web3.utils.hexToBytes(messageHex);
      const messageBuffer = Buffer.from(messageBytes);
      const hash = ethereumjsUtil.bufferToHex(ethereumjsUtil.keccak256(messageBuffer));
      const signature = Account.sign(hash, process.env.PRIVATE_KEY);

      await bogContract.mint(tokenAmount, timestamp, signature, { 'from': minterAddress, 'value': price });
      const bnTokens = await bogContract.walletOfOwner(accounts[1]);
      var tokens = [];
      bnTokens.forEach(bn => tokens.push(bn.toNumber()));

      assert.deepEqual(tokens.length, tokenAmount);
    });

    it("should fail with incorrect signature", async function () {
      const price = await bogContract.price(1);

      // Fake Signature
      const signature = web3.utils.utf8ToHex('fakesignature');
      await truffleAssert.reverts(bogContract.mint(tokenAmount, timestamp, signature, { 'from': minterAddress, 'value': price }));
    });

    it("should fail with previous timestamp", async function () {
      const price = await bogContract.price(1);
      
      // Data Pack
      const data = web3.eth.abi.encodeParameters(
        ['address', 'uint256', 'uint256'],
        [minterAddress, tokenAmount, timestamp - 31]
      );
      
      // Signature Generate
      const messageHex = web3.utils.isHexStrict(data) ? data : web3.utils.utf8ToHex(data);
      const messageBytes = web3.utils.hexToBytes(messageHex);
      const messageBuffer = Buffer.from(messageBytes);
      const hash = ethereumjsUtil.bufferToHex(ethereumjsUtil.keccak256(messageBuffer));
      const signature = Account.sign(hash, process.env.PRIVATE_KEY);

      await truffleAssert.reverts(bogContract.mint(tokenAmount, timestamp - 31, signature, { 'from': minterAddress, 'value': price }));
    })
  });

  describe('withdraw function check', function(){
    // const royalAddresses = ['0xD8c844d326316358BD156b88D61F7C7dECF3446b', '0x348EA0F28b3FfA185b00415d78FFe7FC2BFFa794'];
    // const valuePercentages = [80, 20];

    it("should fail with non-owner account", async function () {
      await truffleAssert.reverts(bogContract.withdrawAll({'from': accounts[1]}));
    });

    it("should withdraw ethers to royalty addresses", async function () { 
      await bogContract.withdrawAll({'from': accounts[0]});
    });
  });

  // describe('getUnsoldTokens function check', function(){
  //   const minted = [10];

  //   it("should get unsold token ids", async function () {
  //     const tokenBNs = await bogContract.getUnsoldTokens(1, 999 * 2);
  //     var unsoldTokens = [];
  //     tokenBNs.forEach(bn => unsoldTokens.push(bn.toNumber()));
  //     unsoldTokens = unsoldTokens.filter(token => token != 0);
      
  //     minted.forEach(mintedToken => {
  //       assert.equal(unsoldTokens.filter(unsoldToken => unsoldToken == mintedToken).length, 0);
  //     });

  //     assert.equal(unsoldTokens.length, 999 * 2 - minted.length);
  //   })
  // });

  // describe('mintUnsoldTokens function check', function(){
  //   const wantedTokens = [20, 30];
    
  //   it("should fail with non-owner account", async function () {
  //     await truffleAssert.reverts(bogContract.mintUnsoldTokens(wantedTokens, {'from': accounts[1]}));
  //   });

  //   it("should fail when Pause is false", async function () {
  //     await bogContract.setPause(false, {'from': accounts[0]});
  //     await truffleAssert.reverts(bogContract.mintUnsoldTokens(wantedTokens, {'from': accounts[0]}));
  //   })

  //   it("should mint 2 tokens for owner account", async function () {
  //     await bogContract.setPause(true, {'from': accounts[0]});
  //     await bogContract.mintUnsoldTokens(wantedTokens, {'from': accounts[0]});
  //     const ownerBNTokens = await bogContract.walletOfOwner(accounts[0]);
  //     var ownerTokens = [];
  //     ownerBNTokens.forEach(bn => ownerTokens.push(bn.toNumber()));

  //     assert.deepEqual(ownerTokens, wantedTokens);
  //   });
  // });

  describe('Metadata Hide / Reveal check', function(){
    const sampleURI = "https://ipfs.io/ipfs/QmQaWLSf3k2z3zKBZJ6CS5s5ud3VZ4FneW6xqxK3bGCTpW/sample";
    
    it("setSampleURI should fail with non-owner account", async function () {
      await truffleAssert.reverts(bogContract.setSampleURI(sampleURI, {'from': accounts[1]}));
    })
    
    it("should set sample token URI", async function () {
      await bogContract.setSampleURI(sampleURI, {'from': accounts[0]});
    });

    it("setMetaReveal should fail with non-owner account", async function () {
      await truffleAssert.reverts(bogContract.setMetaReveal(false, 1, 999, {'from': accounts[1]}));
    });

    it("setMetaReveal for hide should work correctly to return sample metadata", async function(){
      await bogContract.setMetaReveal(false, 1, 999, {'from': accounts[0]});
      const testTokenURI = await bogContract.tokenURI(3);
      assert.equal(testTokenURI, sampleURI);
    });

    it("setMetaReveal for reveal should work correctly to return correct metadata", async function(){
      await bogContract.setMetaReveal(true, 0, 0, {'from': accounts[0]});
      const testTokenURI = await bogContract.tokenURI(3);
      assert.equal(testTokenURI, "https://ipfs.io/ipfs/NewUriToReplace/3");
    })
  });

  describe('giftMint admin func check', function() {
    const royalAddresses = ['0xD8c844d326316358BD156b88D61F7C7dECF3446b', '0x348EA0F28b3FfA185b00415d78FFe7FC2BFFa794'];
    const tokenAmounts = [5, 4];

    it("should fail with non-owner account", async function () {
      await truffleAssert.reverts(bogContract.giftMint(royalAddresses, tokenAmounts, {'from': accounts[1]}));
    });

    it("should mint gift tokens correctly", async function () {
      await bogContract.giftMint(royalAddresses, tokenAmounts, {'from': accounts[0]});
      for(let i = 0; i < royalAddresses.length; i ++){
        let bnTokens = await bogContract.walletOfOwner(royalAddresses[i]);
        let tokens = [];
        bnTokens.forEach(bn => tokens.push(bn.toNumber()));
        assert.equal(tokens.length, tokenAmounts[i]);
      }
    });
  })
});
