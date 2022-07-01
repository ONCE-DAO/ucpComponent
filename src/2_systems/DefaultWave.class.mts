import { UUiD } from "ior:esm:/tla.EAM.Once[dev-merge]";
import { UcpModelChangeLogMethods } from "../3_services/UcpModel.interface.mjs";
import Wave from "../3_services/Wave.interface.mjs";


export default class DefaultWave implements Wave {
    from: any;
    to: any;
    key: string[];
    method: UcpModelChangeLogMethods;
    time: number;
    id: string;

    constructor(key: string[], from: any, to: any, method: UcpModelChangeLogMethods, time?: number, id?: string) {
        this.key = key;
        this.from = from;
        this.to = to;
        this.method = method;
        this.time = time || Date.now();
        this.id = id || UUiD.uuidv4();
    }
}
