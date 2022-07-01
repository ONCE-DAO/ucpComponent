import { Thing, IOR, Class } from "ior:esm:/tla.EAM.Once[dev-merge]";
import { RelatedObjectStoreInterface } from "ior:esm:/tla.EAM.Once.Store[build]";
import { PersistanceManagerHandler } from "./PersistanceManagerHandler.interface.mjs";
import UcpModel from "./UcpModel.interface.mjs";

export default interface UcpComponent<ModelDataType, ClassInterface> extends Thing<ClassInterface> {
    model: ModelDataType;
    add(object: any): Promise<boolean>;
    IOR: IOR;
    persistanceManager: PersistanceManagerHandler;
    Store: RelatedObjectStoreInterface;
    ucpModel: UcpModel;
}



export interface UcpComponentStatics<ModelDataType, ClassInterface> extends Class<ClassInterface> {
    modelSchema: any;
    modelDefaultData: ModelDataType;
    IOR: IOR;
}