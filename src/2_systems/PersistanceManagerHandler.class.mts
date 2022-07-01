import { OnceMode } from "ior:esm:/tla.EAM.Once[dev-merge]"
import { PM_ACTION } from "../1_infrastructure/BasePersistanceManager.class.mjs"
import PersistanceManager, { UDEObject, PersistanceManagerID } from "../3_services/PersistanceManager.interface.mjs"
import { PersistanceManagerHandler } from "../3_services/PersistanceManagerHandler.interface.mjs"
import UcpComponent from "../3_services/UcpComponent.interface.mjs"


export class DefaultPersistanceManagerHandler implements PersistanceManagerHandler {
    async create(): Promise<any[]> {
        return this.runPMAction(PM_ACTION.create)
    }
    async retrieve(): Promise<UDEObject[]> {
        return this.runPMAction(PM_ACTION.retrieve)
    }
    async update(): Promise<any[]> {
        return this.runPMAction(PM_ACTION.update)
    }
    async delete(): Promise<any[]> {
        return this.runPMAction(PM_ACTION.delete)
    }
    async addAlias(alias: string): Promise<any[]> {
        if (alias.match(/\./)) throw new Error("No '.' are allowed in alias")
        return this.runPMAction(PM_ACTION.addAlias, alias)
    }
    async removeAlias(alias: string): Promise<any[]> {
        return this.runPMAction(PM_ACTION.removeAlias, alias)
    }

    retrieveFromData(udeData: UDEObject): Promise<any[]> {
        return this.runPMAction(PM_ACTION.retrieveFromData, udeData);
    }

    get list(): PersistanceManager[] {
        return this.ucpComponent.Store.lookup(PersistanceManagerID) as PersistanceManager[];
    }

    private async runPMAction(action: PM_ACTION, param1?: any): Promise<any[]> {
        const persistenceManagerList = this.list;
        const resultPromises = [];
        if (persistenceManagerList.length > 0) {
            for (let pm of persistenceManagerList) {
                if (action === PM_ACTION.addAlias || action === PM_ACTION.removeAlias || action === PM_ACTION.retrieveFromData) {
                    resultPromises.push(pm[action](param1));
                } else {
                    resultPromises.push(pm[action]());
                }
            }
        } else {
            throw new Error("No PersistanceManager Found")
        }
        let result = await Promise.all(resultPromises);

        return result;
    }

    constructor(private ucpComponent: UcpComponent<any, any>) {
    }


}

if (typeof ONCE !== "undefined" && ONCE.mode === OnceMode.BROWSER) {
    //await import('./BrowserUDEPersistanceManager.class')
}