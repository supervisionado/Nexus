import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("NexusModule", (m) => {
  const nexus = m.contract("Nexus");

  return { nexus };
});