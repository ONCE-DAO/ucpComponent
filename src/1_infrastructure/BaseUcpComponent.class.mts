
import { OnceMode, ClassDescriptor, BaseThing, IOR, DefaultIOR } from "ior:esm:/tla.EAM.Once[dev]";
import { RelatedObjectStore, RelatedObjectStoreInterface } from "ior:esm:/tla.EAM.Store[main]";
import { UcpModelProxySchema } from "../2_systems/DefaultUcpModel.class.mjs";
import { DefaultPersistanceManagerHandler } from "../2_systems/PersistanceManagerHandler.class.mjs";
import { PersistanceManagerHandler } from "../3_services/PersistanceManagerHandler.interface.mjs";
import UcpModel from "../3_services/UcpModel.interface.mjs";
import { z } from "../2_systems/zod/index.js";

import { BasePersistanceManager } from "./BasePersistanceManager.class.mjs";
import UcpComponent from "../3_services/UcpComponent.interface.mjs";


// HACK: ONCE should be there 
// ONCE ist undefined beim Import, wenn es auf dem Server läuft
if (typeof window === "undefined") {
    await import("../2_systems/FilePersistanceManager.class.mjs")
} else {
    await import("../2_systems/BrowserUDEPersistanceManager.class.mjs")
}
@ClassDescriptor.componentExport('namedExport')
export default abstract class BaseUcpComponent<ModelDataType, ClassInterface> extends BaseThing<ClassInterface> implements UcpComponent<ModelDataType, ClassInterface> {
    readonly Store: RelatedObjectStoreInterface = new RelatedObjectStore();
    private _persistanceManager: DefaultPersistanceManagerHandler | undefined;
    private _IOR: IOR | undefined;
    public abstract ucpModel: UcpModel;

    get persistanceManager(): PersistanceManagerHandler {

        if (this._persistanceManager === undefined) {
            BasePersistanceManager.getPersistenceManager(this);
            this._persistanceManager = new DefaultPersistanceManagerHandler(this);
        }
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

    private static _IOR: IOR | undefined;

    static get IOR(): IOR {
        if (!this._IOR) {
            this._IOR = new DefaultIOR();

            // TODO Replace localhost
            let href = 'ior:esm:' + this.classDescriptor.classPackageString;
            this._IOR.init(href);
        }
        return this._IOR;
    }

}
