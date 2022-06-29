import Class from "./Class.interface.mjs";
import IOR from "./IOR.interface.mjs";
import { PersistanceManagerHandler } from "./PersistanceManagerHandler.interface.mjs";
import RelatedObjectStore from "./RelatedObjectStore.interface.mjs";
import Thing from "./Thing.interface.mjs";
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