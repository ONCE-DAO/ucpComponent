import PersistanceManager, { UDEObject } from "./PersistanceManager.interface.mjs";

export interface PersistanceManagerHandler {
    create(): Promise<any[]>;
    retrieve(): Promise<UDEObject[]>;
    update(): Promise<any[]>;
    delete(): Promise<any[]>;
    retrieveFromData(udeData: UDEObject): Promise<any[]>;
    list: PersistanceManager[];

    addAlias(alias: string): Promise<any[]>;
    removeAlias(alias: string): Promise<any[]>;

    // await(): Promise<any[]>;
}