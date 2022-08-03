
import { DefaultRelatedObjectStore, RelatedObjectStore } from "ior:esm:/tla.EAM.Once.Store[build]";
import { BaseThing, DefaultIOR, IOR } from "ior:esm:/tla.EAM.Once[build]";
import { UcpModelProxySchema } from "../2_systems/DefaultUcpModel.class.mjs";
import { DefaultPersistanceManagerHandler } from "../2_systems/PersistanceManagerHandler.class.mjs";
import { PersistanceManagerHandler } from "../3_services/PersistanceManagerHandler.interface.mjs";
import UcpComponent from "../3_services/UcpComponent.interface.mjs";
import UcpModel from "../3_services/UcpModel.interface.mjs";

import { z } from "ior:esm:/dev.zod[test-component]";
import { BasePersistanceManager } from "./BasePersistanceManager.class.mjs";


// HACK: ONCE should be there 
// ONCE ist undefined beim Import, wenn es auf dem Server läuft
if (typeof window === "undefined") {
    await import("../2_systems/FilePersistanceManager.class.mjs")
} else {
    await import("../2_systems/BrowserUDEPersistanceManager.class.mjs")
}
export default abstract class BaseUcpComponent<ModelDataType, ClassInterface> extends BaseThing<ClassInterface> implements UcpComponent<ModelDataType, ClassInterface> {
    abstract modelSchema: any;

    readonly Store: RelatedObjectStore = new DefaultRelatedObjectStore();
    private _persistanceManager: DefaultPersistanceManagerHandler | undefined;
    private _IOR: IOR | undefined;
    public abstract ucpModel: UcpModel;


    //HACK Need to be replaced. But it requires after the last changes async
    async initPersistanceManager(): Promise<void> {
        if (this._persistanceManager === undefined) {
            await BasePersistanceManager.getPersistenceManager(this);
            this._persistanceManager = new DefaultPersistanceManagerHandler(this);
        }
    }

    get persistanceManager(): PersistanceManagerHandler {
        if (!this._persistanceManager) throw new Error("Please init first! initPersistanceManager")
        return this._persistanceManager;
    }

    get IOR(): IOR {
        if (!this._IOR) {
            this._IOR = DefaultIOR.createUdeIor();
        }
        return this._IOR;
    }

    set IOR(newIOR: IOR) {
        this._IOR = newIOR;
    }

    async add(object: any): Promise<boolean> {
        throw new Error("Method not implemented.");
    }

    get model(): ModelDataType {
        return this.ucpModel.model;
    }

    set model(value: any) {
        this.ucpModel.model = value;
    }

    get toJSON(): string {
        // TODO If Object is UDE and is persisted the result should the the IOR
        return this.ucpModel.toJSON;
    }

    static get modelSchema() {
        return z.object({
            _component: z.object({
                name: z.string()
            }).merge(UcpModelProxySchema)
        })
    }


    static get modelDefaultData() {
        return { _component: { name: this.name } }
    }

    // static get IOR(): IOR {
    //     return this.classDescriptor.classIOR;
    // }

}
