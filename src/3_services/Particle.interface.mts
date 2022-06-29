import { UcpModelChangelog } from "./UcpModel.interface.mjs";
import Wave from "./Wave.interface.mjs";

export default interface Particle {
    id: string;
    predecessorId: string | undefined;
    changelog: UcpModelChangelog,
    modelSnapshot: any,
    waveList: Wave[],
    addChange(ChangeLog: Wave): void;
    time: number;
}

export type ParticleUDEStructure = {
    data: any,
    time: number,
    version: string,
    predecessorVersion: string | undefined
};