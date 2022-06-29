import { UcpModelChangeLogMethods } from "./UcpModel.interface.mjs";

export default interface Wave {
    to: any,
    key: string[],
    method: UcpModelChangeLogMethods,
    from: any,
    time: number
}