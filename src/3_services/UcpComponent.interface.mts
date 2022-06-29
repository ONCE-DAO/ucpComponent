import { Thing, IOR, Class } from "ior:esm:/tla.EAM.Once[dev]";
import { RelatedObjectStore } from "ior:esm:/tla.EAM.Store[main]";
import { PersistanceManagerHandler } from "./PersistanceManagerHandler.interface.mjs";
import UcpModel from "./UcpModel.interface.mjs";

export default interface UcpComponent<ModelDataType, ClassInterface> extends Thing<ClassInterface> {
    model: ModelDataType;
    add(object: any): Promise<boolean>;
    IOR: IOR;
    persistanceManager: PersistanceManagerHandler;
    Store: RelatedObjectStore;
    ucpModel: UcpModel;
}



export interface UcpComponentStatics<ModelDataType, ClassInterface> extends Class<ClassInterface> {
    modelSchema: any;
    modelDefaultData: ModelDataType;
    IOR: IOR;
}