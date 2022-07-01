import { UUiD } from "ior:esm:/tla.EAM.Once[dev-merge]";
import Particle, { ParticleUDEStructure } from "../3_services/Particle.interface.mjs";
import { UcpModelChangelog, UcpModelChangeLogMethods } from "../3_services/UcpModel.interface.mjs";
import Wave from "../3_services/Wave.interface.mjs";
import { DefaultUcpModelChangeLog } from "./DefaultUcpModel.class.mjs";
import DefaultWave from "./DefaultWave.class.mjs";


export default class DefaultParticle implements Particle {
    id: string;
    predecessorId: string | undefined;
    modelSnapshot: any;

    constructor(id?: string) {
        this.id = id || UUiD.uuidv4();

    }
    // TODO Change for Browser
    time: number = Date.now();

    readonly waveList: Wave[] = [];
    public readonly changelog: UcpModelChangelog = new DefaultUcpModelChangeLog();

    addChange(WaveItem: Wave): void {
        this.waveList.push(WaveItem);
        this.add2ChangeLog(WaveItem);
    }

    private add2ChangeLog(WaveItem: Wave): void {
        let changelog = this.changelog as any;
        for (let i = 0; i < WaveItem.key.length - 1; i++) {
            const subKey = WaveItem.key[i];
            if (!changelog.hasOwnProperty(subKey)) {
                changelog[subKey] = new DefaultUcpModelChangeLog();
            }
            changelog = changelog[subKey];

        }
        this.deepChangeLog(WaveItem.to, WaveItem.from, WaveItem.key, WaveItem.time, changelog);
    }

    private deepChangeLog(targetData: any, originalData: any, path: string[], time: number, upperLevelChangeLog: UcpModelChangelog): UcpModelChangelog | Wave | null {

        if (targetData?._helper?._proxyTools?.isProxy !== true) {
            if (targetData === originalData) return null;
            let method;
            if (originalData == undefined) {
                method = UcpModelChangeLogMethods.create;
            } else if (targetData == undefined) {
                method = UcpModelChangeLogMethods.delete;
            } else {
                method = UcpModelChangeLogMethods.set;
            }

            upperLevelChangeLog[path[path.length - 1]] = new DefaultWave(
                [...path],
                originalData,
                targetData,
                method,
                time
            );
        } else {

            let innerChangeLog: UcpModelChangelog = new DefaultUcpModelChangeLog()
            upperLevelChangeLog[path[path.length - 1]] = innerChangeLog;
            let key: string;
            let value: any;
            for ([key, value] of Object.entries(targetData)) {

                const currentPath = path.concat(key)
                let currentValue = (originalData !== undefined ? originalData[key] : undefined);

                //let newValue: UcpModelChangeLog | UcpModelChangeLogItem | null;
                this.deepChangeLog(value, currentValue, currentPath, time, innerChangeLog);

            }

            // Changelog for the from (Deleted parameter)
            if (originalData) {
                Object.keys(originalData).forEach(key => {
                    if (typeof targetData[key] === 'undefined') {

                        innerChangeLog[key] = new DefaultWave(
                            [...path, key],
                            originalData[key],
                            value,
                            UcpModelChangeLogMethods.delete,
                            time
                        );
                    }
                })
            }
        }

        return upperLevelChangeLog;

    }

    static validateParticleStructure(object: ParticleUDEStructure): ParticleUDEStructure {
        if (typeof object.data !== 'object') throw new Error(`Parameter 'data' is wrong in Object value: '${object.data}`);
        if (typeof object.time !== 'number') throw new Error(`Parameter 'time' is wrong in Object value: '${object.time}`)
        if (typeof object.version !== 'string') throw new Error(`Parameter 'version' is wrong in Object value: '${object.version}`)
        if (typeof object.predecessorVersion !== 'string' && typeof object.predecessorVersion !== 'undefined') throw new Error(`Parameter 'predecessorVersion' is wrong in Object value: '${object.predecessorVersion}`)

        return object;
    }


}
