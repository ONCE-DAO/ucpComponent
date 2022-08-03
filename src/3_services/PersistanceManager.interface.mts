
import { Class, InterfaceDescriptor, IOR } from "ior:esm:/tla.EAM.Once[build]";

import { ParticleUDEStructure } from "./Particle.interface.mjs";
import { UcpModelChangelog } from "./UcpModel.interface.mjs";

export default interface PersistanceManager {
  create(): Promise<void>;
  retrieve(ior?: IOR): Promise<UDEObject>;
  retrieveFromData(data: UDEObject): Promise<UDEObject>;
  update(): Promise<void>;
  delete(): Promise<void>;
  onModelChanged(changeObject: UcpModelChangelog): Promise<void>;
  onNotification(changeObject: UcpModelChangelog): Promise<void>;

  addAlias(alias: string): Promise<void>;
  removeAlias(alias: string): Promise<void>;

  alias: string[];
}


export type UDEObject = {
  id: string,
  alias?: string[],
  instanceIOR: string,
  typeIOR: string,
  particle: ParticleUDEStructure
}

// TODO@BE Need to use it
export interface PersistanceManagerStatic<ClassInterface> extends Class<ClassInterface> {
  canHandle(ior: IOR): number;
}
