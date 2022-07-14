import { CRUD_Client, IOR, OnceMode, urlProtocol } from "ior:esm:/tla.EAM.Once[build]";
import { BasePersistanceManager } from "../1_infrastructure/BasePersistanceManager.class.mjs";
import { UDEObject } from "../3_services/PersistanceManager.interface.mjs";
import { UcpModelChangelog } from "../3_services/UcpModel.interface.mjs";
import UDELoader from "./UDELoader.class.mjs";


export class BrowserUDEPersistenceManager extends BasePersistanceManager {

    get backendActive(): boolean {
        return this.backendVersion !== undefined;
    }

    private backendVersion: string | undefined = undefined;

    static readonly _aliasSeparator: string = ".";

    static canHandle(ior: IOR): number {
        if (ONCE && (ONCE.mode === OnceMode.BROWSER)) {
            if (ior.id && ior.protocol.includes(urlProtocol.ude)) {
                return 1;
            }
        }
        return 0;
    }

    canHandle(ior: IOR): number {
        return BrowserUDEPersistenceManager.canHandle(ior);
    }

    get IOR(): IOR & { id: string } | undefined {
        let ior = this.ucpComponent?.IOR;
        if (ior && typeof ior.id === 'undefined') throw new Error("Missing ID");
        return ior as IOR & { id: string } | undefined;
    }


    async getClient(ior?: IOR): Promise<CRUD_Client> {
        let internalIOR: IOR | undefined = ior || this.IOR;
        if (!internalIOR) throw new Error("Missing IOR");

        let DefaultClient = (await import("ior:esm:/tla.EAM.Once[build]")).DefaultClient;

        let client = DefaultClient.findClient(internalIOR);
        if (!client) throw new Error("No Client found");
        return client as CRUD_Client;

    }

    async create(): Promise<void> {
        if (!this.ucpComponent || !this.IOR) throw new Error("Missing UCP Component");

        let data = this.ucpComponentData;
        let client = await this.getClient();
        const response = await client.create(this.IOR, data);
        if (!response.ok) throw new Error("Create of UDE failed " + response.statusText);

        this.backendVersion = data.particle.version;
    }



    async retrieve(ior?: IOR & { id: string }): Promise<UDEObject> {
        let internalIOR = ior || this.IOR;
        if (!internalIOR) throw new Error("Missing IOR");

        let client = await this.getClient(internalIOR);
        const response = await client.retrieve(internalIOR);
        if (!response.ok) throw new Error("Retrieve of UDE failed " + response.statusText);

        const udeObject = UDELoader.validateUDEStructure(response.parsedData);

        await this.retrieveFromData(udeObject);
        return udeObject;
    }

    async retrieveFromData(udeObject: UDEObject): Promise<UDEObject> {
        if (this.ucpComponent) {
            this.ucpComponent.model = udeObject.particle.data;
            this.backendVersion = udeObject.particle.data.version;
            if (udeObject.alias) this.alias = udeObject.alias;
        }
        return udeObject;
    }



    async update(): Promise<void> {

        if (!this.ucpComponent || !this.IOR) throw new Error("Missing UCP Component");

        let data = this.ucpComponentData;
        let client = await this.getClient();
        const response = await client.update(this.IOR, data);
        if (!response.ok) throw new Error("Update of UDE failed " + response.statusText);

        this.backendVersion = data.particle.version;
    }

    async delete(): Promise<void> {
        if (!this.backendActive) return;

        if (!this.ucpComponent || !this.IOR) throw new Error("Missing UCP Component");

        let client = await this.getClient();
        const response = await client.retrieve(this.IOR);

        if (!response.ok) throw new Error("Delete of UDE failed " + response.statusText);
        UDELoader.factory().removeObjectFromStore(this.IOR);
        this.backendVersion = undefined;
    }



    async onModelChanged(changeObject: UcpModelChangelog): Promise<void> {
        if (this.backendVersion) {
            await this.update();
        }
    }
    onNotification(changeObject: UcpModelChangelog): Promise<void> {
        throw new Error("Method not implemented.");
    }


}

