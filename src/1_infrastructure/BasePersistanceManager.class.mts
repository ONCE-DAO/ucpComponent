import { BaseThing, IOR } from "ior:esm:/tla.EAM.Once[build]";
import PersistanceManager, { PersistanceManagerID, UDEObject } from "../3_services/PersistanceManager.interface.mjs";
import UcpComponent from "../3_services/UcpComponent.interface.mjs";
import { UcpModelChangelog, UcpModelEvents } from "../3_services/UcpModel.interface.mjs";


export enum PM_ACTION { create = "create", retrieve = "retrieve", update = "update", delete = "delete", addAlias = "addAlias", removeAlias = "removeAlias", retrieveFromData = "retrieveFromData" }

export abstract class BasePersistanceManager extends BaseThing<any> implements PersistanceManager {
    public alias: string[] = [];

    abstract create(): Promise<void>
    abstract retrieve(): Promise<UDEObject>
    abstract update(): Promise<void>
    abstract delete(): Promise<void>
    abstract onModelChanged(changeObject: UcpModelChangelog): Promise<void>
    abstract onNotification(changeObject: UcpModelChangelog): Promise<void>
    abstract retrieveFromData(data: UDEObject): Promise<UDEObject>
    abstract get backendActive(): boolean

    protected ucpComponent: UcpComponent<any, any> | undefined;

    static getPersistenceManager(object: UcpComponent<any, any> | IOR): PersistanceManager | undefined {



        let ior: IOR;
        let ucpComponent: UcpComponent<any, any> | undefined;
        if ("IOR" in object) {
            ucpComponent = object;
            ior = object.IOR;
        } else {
            ior = object;

        }

        const classList = PersistanceManagerID.implementations.map(x => {
            return {
                result: (x.class.canHandle ? x.class.canHandle(ior) : 0) as number,
                aClass: x.class
            }
        }
        );
        const sortedClassList = classList.sort((a, b) => b.result - a.result);

        if (sortedClassList.length > 0 && classList[0].result > 0) {
            return new classList[0].aClass(ucpComponent);
        }
    }

    async addAlias(alias: string): Promise<void> {
        if (this.backendActive) {
            this.alias.push(alias);
            await this.update();
        } else {
            this.alias.push(alias);
        }
    }

    async removeAlias(alias: string): Promise<void> {
        if (this.backendActive) {
            this.alias.splice(this.alias.indexOf(alias), 1);
            await this.update();
        } else {
            this.alias.splice(this.alias.indexOf(alias), 1);
        }
    }

    get ucpComponentData(): UDEObject {
        if (!this.ucpComponent) throw new Error("Missing ucpComponent");
        const ucpComponent = this.ucpComponent;
        const IOR = this.ucpComponent.IOR;
        const modelData = ucpComponent.ucpModel.toUDEStructure();

        if (!IOR.id) throw new Error("Missing IOR ID in " + IOR.href);
        const udeData: UDEObject = {
            id: IOR.id,
            instanceIOR: IOR.href,
            typeIOR: ucpComponent.classDescriptor.class.IOR.href,
            particle: modelData,
        };
        if (this.alias) udeData.alias = this.alias;

        return udeData;
    }

    constructor(ucpComponent?: UcpComponent<any, any>) {
        super();
        if (ucpComponent) {
            this.ucpComponent = ucpComponent;
            ucpComponent.Store.register(this);
            ucpComponent.ucpModel.eventSupport.addEventListener(UcpModelEvents.ON_MODEL_CHANGED, this.onModelChanged.bind(this), this);
        }
    }



}

