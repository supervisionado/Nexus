import { expect } from "chai";
import { Block, Contract } from "ethers";
import { network } from "hardhat";
import { toASCII } from "punycode";

const { ethers } = await network.connect();

describe("Nexus unit test", function () {

 // Define a fixture that deploys your contracts and returns whatever you need
  async function deployFixture() {

    const [owner, otherAcc] = await ethers.getSigners();

    const gnft = await ethers.getContractFactory("GenericNFT");
    const nft = await gnft.deploy(owner.address);
    await nft.waitForDeployment();
    const nftaddr = await nft.getAddress();    

    const NexusContract = await ethers.getContractFactory("Nexus");
    const nexus = await NexusContract.deploy();
    await nexus.waitForDeployment();

    return { nft, nexus, owner, otherAcc };
  }

  it("Should set & get collection addy correctly", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    const ady = await nft.getAddress();
    await nexus.setCollectionAddr(ady);
    const ady2 = await nexus.getCollectionAddr();
  
    expect(ady).to.equal(ady2);
  });


  it("Should NOT set collection addy (empty address)", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    await expect (nexus.setCollectionAddr("0x0000000000000000000000000000000000000000")).to.be.revertedWithCustomError(nexus,"NullAddressNotAllowed");

  });  

  it("Should NOT set collection addy (locked!)", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    const nexusaddr = await nexus.getAddress();
    const fnftaddr = await nft.getAddress();
    const owneraddr = owner.address;    
  
    await nft.safeMint(owneraddr, "ipfs://nft/1");
    await nft.setApprovalForAll(nexusaddr, true);
    await nexus.setCollectionAddr(fnftaddr);
    await nexus.listForSale(0, 100000000000000000000n, 1000000n);     

    await expect (nexus.setCollectionAddr("0x1230000000000000000000000000000000000321")).to.be.revertedWithCustomError(nexus,"UnAuthorized");

  });    


  it("Should set & get royalties percent correctly", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    const rol = 1000;
    await nexus.setRoyaltiesBPS(rol)
    const rol2 = await nexus.getRoyaltiesBPS();
  
    expect(rol).to.equal(rol2);
  });  


  it("Should set & get floor price correctly", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    const fprice = 1000000000000000000n;
    await nexus.setFloorPrice(fprice);
    const fprice2 = await nexus.getFloorPrice();
  
    expect(fprice).to.equal(fprice2);
  });    



  it("Should NOT set royalties percent (input out of range)", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    await expect (nexus.setRoyaltiesBPS(10000)).to.be.revertedWithCustomError(nexus,"InputOutOfRange");

  });    


  it("Should set & get marketplace fee correctly", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    const mktfee = "10";
    await nexus.setMarketplaceFee(ethers.parseEther(mktfee));
    const mktfee2 = (await nexus.getMarketplaceFee()).toString();
    expect(mktfee2).to.equal("10000000000000000000");

  });


  it("Should NOT disable listing (not the owner of the token listed)", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    const nexusaddr = await nexus.getAddress();
    const owneraddr = owner.address;
    const fnftaddr = await nft.getAddress();
  
    await nft.safeMint(owneraddr, "ipfs://nft/1");
    await nft.setApprovalForAll(nexusaddr, true);
    await nexus.setCollectionAddr(fnftaddr);
    await nexus.listForSale(0, 100000000000000000000n, 1000000n); 
    const instance = await nexus.connect(otherAcc);       

    await expect (instance.disableListing(0)).to.be.revertedWithCustomError(nexus,"UnAuthorized");

  });    

  it("Should NOT disable listing (already disabled)", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    const nexusaddr = await nexus.getAddress();
    const fnftaddr = await nft.getAddress();
    const owneraddr = owner.address;    
  
    await nft.safeMint(owneraddr, "ipfs://nft/1");
    await nft.setApprovalForAll(nexusaddr, true);
    await nexus.setCollectionAddr(fnftaddr);
    await nexus.listForSale(0, 100000000000000000000n, 1000000n); 
    await nexus.disableListing(0);       

    await expect (nexus.disableListing(0)).to.be.revertedWithCustomError(nexus,"ListingInactiveOrExpired");

  });  
  
  
  it("Should disable listing & EMIT expired", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    const nexusaddr = await nexus.getAddress();
    const fnftaddr = await nft.getAddress();
    const owneraddr = owner.address;
  
    await nft.safeMint(owneraddr, "ipfs://nft/1");
    await nft.setApprovalForAll(nexusaddr, true);
    await nexus.setCollectionAddr(fnftaddr);
    await nexus.listForSale(0, 100000000000000000000n, 1000000n); 


    const block = await ethers.provider.getBlock("latest");
    const expired = block!.timestamp + 1000001; 

    ethers.provider.send("evm_increaseTime", [expired]);
    ethers.provider.send("evm_mine");

    //console.log(`Block number is ${block?.number} & expired block should be ${expired}`);

    await expect (nexus.disableListing(0)).to.emit(nexus, "ListingExpired").withArgs(0);

  });   


  it("Should list for sale PhanicNFT token and buy with other acc", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    const nexusaddr = await nexus.getAddress();
    const fnftaddr = await nft.getAddress();
    const owneraddr = owner.address;
  
    await nft.safeMint(owneraddr, "ipfs://nft/1");
    //await nft.setApprovalForAll(nexusaddr, true);
    await nft.approve(nexusaddr, 0);
    await nexus.setCollectionAddr(fnftaddr);
    await nexus.listForSale(0, 100000000000000000000n, 1000000n);
    const trade = await nexus.fetchTokenListing(0);
    //console.log(`O valor desejo do item é ${trade[1]} wei.`);    
    const oldOwner = await nft.ownerOf(0);
    const instance = await nexus.connect(otherAcc);
    //const balanceBefore = await ethers.provider.getBalance(owner.address); 
    const mktfee = "10";
    const valor = (trade[1] * 105n) / 100n + ethers.parseEther(mktfee);  
    //console.log(`Estou enviando com comissão de mercado ${valor} wei.`);   
    await nexus.setMarketplaceFee(ethers.parseEther(mktfee)); 
    await nexus.setRoyaltiesBPS(500);   
    const listings = await nexus.getMarketplaceTotalListings();
    const ulist1 = await nexus.getUserListings(owner.address);
    await instance.buyListing(0,  { value: valor });
    const ulist2 = await nexus.getUserListings(owner.address);
    //const balanceAfter = await ethers.provider.getBalance(owner.address);
    const nexusBalance = await ethers.provider.getBalance(nexusaddr);
    await nexus.withdrawAll();
    const nexusBalance2 = await ethers.provider.getBalance(nexusaddr);

    expect(listings).to.be.equal(1);
    expect(ulist1).to.be.equal(1);
    expect(ulist2).to.be.equal(0);
    expect(nexusBalance).to.be.equal(15000000000000000000n); // 15 eth
    expect(nexusBalance2).to.be.equal(0n);
    expect(oldOwner).to.equal(owner.address); 
    const sales = await nexus.getMarketplaceTotalSales();
    expect(sales).to.equal(1);
    const sales2 = await nexus.getUserSales(owner.address);
    expect(sales2).to.equal(1);
    const purchases = await nexus.getUserPurchases(otherAcc.address);   
    expect(purchases).to.equal(1);  
    const salesVol = await nexus.getUserSalesVolume(owner.address);
    expect(salesVol).to.equal(100000000000000000000n);      // 100 eth
    const newOwner = await nft.ownerOf(0);
    expect(newOwner).to.equal(otherAcc.address);    


  });


it("Should re-list already active NFT listing", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    const nexusaddr = await nexus.getAddress();
    const fnftaddr = await nft.getAddress();
    const owneraddr = owner.address;
  
    await nft.safeMint(owneraddr, "ipfs://nft/1");
    await nft.approve(nexusaddr, 0);
    await nexus.setCollectionAddr(fnftaddr);
    await nexus.listForSale(0, 100000000000000000000n, 1000000n);
    await nexus.listForSale(0, 200000000000000000000n, 1000000n);
    const trade = await nexus.fetchTokenListing(0);  
    
    expect(trade[1]).to.be.equal(200000000000000000000n);   


  });  


it("Should re-list NFT listing & EMIT ListingExpired", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    const nexusaddr = await nexus.getAddress();
    const fnftaddr = await nft.getAddress();
    const owneraddr = owner.address;
  
    await nft.safeMint(owneraddr, "ipfs://nft/1");
    await nft.approve(nexusaddr, 0);
    await nexus.setCollectionAddr(fnftaddr);
    await nexus.listForSale(0, 100000000000000000000n, 1000000n);
    
    const block = await ethers.provider.getBlock("latest");
    const expired = block!.timestamp + 1000001; 

    ethers.provider.send("evm_increaseTime", [expired]);
    ethers.provider.send("evm_mine");

    await expect (nexus.listForSale(0, 100000000000000000000n, 1000000n)).to.emit(nexus, "ListingExpired").withArgs(0);


  });    


  it("Should NOT list for sale PhanicNFT token (not the OWNER)", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    const nexusaddr = await nexus.getAddress();
    const fnftaddr = await nft.getAddress();
    const owneraddr = owner.address;

    await nft.safeMint(owneraddr, "ipfs://nft/1");
    await nft.setApprovalForAll(nexusaddr, true);
    await nexus.setCollectionAddr(fnftaddr);
    const instance = await nexus.connect(otherAcc);
    await expect (instance.listForSale(0, 100000000000000000000n, 1000000n)).to.be.revertedWithCustomError(nexus,"UnAuthorized");

  });  


  it("Should NOT list for sale PhanicNFT token (not enough duration)", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    const nexusaddr = await nexus.getAddress();
    const fnftaddr = await nft.getAddress();
    const owneraddr = owner.address;

    await nft.safeMint(owneraddr, "ipfs://nft/1");
    await nft.setApprovalForAll(nexusaddr, true);
    await nexus.setCollectionAddr(fnftaddr);
    await expect (nexus.listForSale(0, 100000000000000000000n, 3599n)).to.be.revertedWithCustomError(nexus,"InputOutOfRange");

  });    


  it("Should NOT list for sale PhanicNFT token (under floor price)", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    const nexusaddr = await nexus.getAddress();
    const fnftaddr = await nft.getAddress();
    const owneraddr = owner.address;
  
    await nft.safeMint(owneraddr, "ipfs://nft/1");
    await nft.setApprovalForAll(nexusaddr, true);
    await nexus.setCollectionAddr(fnftaddr);
    await expect (nexus.listForSale(0, 1000n, 1000000n)).to.be.revertedWithCustomError(nexus,"InputOutOfRange");

  });  
  
  
it("Should NOT buy NFT listing (listing expired)", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    const nexusaddr = await nexus.getAddress();
    const fnftaddr = await nft.getAddress();
    const owneraddr = owner.address;
  
    await nft.safeMint(owneraddr, "ipfs://nft/1");
    await nft.approve(nexusaddr, 0);
    await nexus.setCollectionAddr(fnftaddr);
    await nexus.listForSale(0, 100000000000000000000n, 1000000n);
    
    const block = await ethers.provider.getBlock("latest");
    const expired = block!.timestamp + 1000001; 

    ethers.provider.send("evm_increaseTime", [expired]);
    ethers.provider.send("evm_mine");

    await expect (nexus.buyListing(0)).to.be.revertedWithCustomError(nexus, "ListingInactiveOrExpired");

  });    
    
  
it("Should NOT buy listing with other acc (not enough funds)", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    const nexusaddr = await nexus.getAddress();
    const fnftaddr = await nft.getAddress();
    const owneraddr = owner.address;
  
    await nft.safeMint(owneraddr, "ipfs://nft/1");
    await nft.setApprovalForAll(nexusaddr, true);
    await nexus.setCollectionAddr(fnftaddr);
    await nexus.listForSale(0, 100000000000000000000n, 1000000n);
    const trade = await nexus.fetchTokenListing(0); 
    const instance = await nexus.connect(otherAcc); 
    const mktfee = "10";
    const valor = (trade[1] * 105n) / 100n + ethers.parseEther(mktfee);    
    await nexus.setMarketplaceFee(ethers.parseEther(mktfee)); 
    await nexus.setRoyaltiesBPS(500);      
    await expect (instance.buyListing(0,  { value: 1000 })).to.be.revertedWithCustomError(nexus,"InsufficientFunds");

  });
  

it("Should NOT buy listing with other acc (listing inactive)", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    const nexusaddr = await nexus.getAddress();
    const fnftaddr = await nft.getAddress();
    const owneraddr = owner.address;
  
    await nft.safeMint(owneraddr, "ipfs://nft/1");
    await nft.setApprovalForAll(nexusaddr, true);
    await nexus.setCollectionAddr(fnftaddr);
    await nexus.listForSale(0, 100000000000000000000n, 1000000n);
    const trade = await nexus.fetchTokenListing(0); 
    const instance = await nexus.connect(otherAcc); 
    const mktfee = "10";
    const valor = (trade[1] * 105n) / 100n + ethers.parseEther(mktfee);    
    await nexus.setMarketplaceFee(ethers.parseEther(mktfee)); 
    await nexus.setRoyaltiesBPS(500);    
    //await instance.buyListing(0,  { value: valor });  
    await nexus.disableListing(0);
    await expect (instance.buyListing(0,  { value: valor })).to.be.revertedWithCustomError(nexus,"ListingInactiveOrExpired");

  });  

it("Should NOT buy listing with other acc (UnAuthorized on contract)", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    const nexusaddr = await nexus.getAddress();
    const fnftaddr = await nft.getAddress();
    const owneraddr = owner.address;

    await nft.safeMint(owneraddr, "ipfs://nft/1");
    await nft.setApprovalForAll(nexusaddr, true);
    await nexus.setCollectionAddr(fnftaddr);
    await nexus.listForSale(0, 100000000000000000000n, 1000000n);
    const trade = await nexus.fetchTokenListing(0); 
    const instance = await nexus.connect(otherAcc); 
    const mktfee = "10";
    const valor = (trade[1] * 105n) / 100n + ethers.parseEther(mktfee);    
    await nexus.setMarketplaceFee(ethers.parseEther(mktfee)); 
    await nexus.setRoyaltiesBPS(500);  
    await nft.setApprovalForAll(nexusaddr, false);      
    await expect (instance.buyListing(0,  { value: valor })).to.be.revertedWithCustomError(nexus,"UnAuthorized");

  });    

it("Should NOT buy listing with other acc (owner changed after listing)", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    const nexusaddr = await nexus.getAddress();
    const fnftaddr = await nft.getAddress();
    const owneraddr = owner.address;

    await nft.safeMint(owneraddr, "ipfs://nft/1");
    await nft.setApprovalForAll(nexusaddr, true);
    await nexus.setCollectionAddr(fnftaddr);
    await nexus.listForSale(0, 100000000000000000000n, 1000000n);
    const trade = await nexus.fetchTokenListing(0); 
    const instance = await nexus.connect(otherAcc); 
    const mktfee = "10";
    const valor = (trade[1] * 105n) / 100n + ethers.parseEther(mktfee);    
    await nexus.setMarketplaceFee(ethers.parseEther(mktfee)); 
    await nexus.setRoyaltiesBPS(500);
    await nft.transferFrom(owner.address, nexusaddr, 0);   
    await expect (instance.buyListing(0,  { value: valor })).to.be.revertedWithCustomError(nexus,"OwnerChanged");

  });     

  it("Should NOT withdrawAll (Empty account)", async function () {
    
    const { networkHelpers } = await network.connect();
    const { nft, nexus, owner, otherAcc } = await networkHelpers.loadFixture(deployFixture);

    await expect (nexus.withdrawAll()).to.be.revertedWithCustomError(nexus,"EmptyAccount");

  });  





});