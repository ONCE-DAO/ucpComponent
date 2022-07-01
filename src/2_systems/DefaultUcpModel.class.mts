import Particle, { ParticleUDEStructure } from "../3_services/Particle.interface.mjs";
import UcpComponent from "../3_services/UcpComponent.interface.mjs";
import UcpModel, { UcpModelChangelog as UcpModelChangelog, UcpModelChangeLogMethods, UcpModelEvents, UcpModelTransactionStates } from "../3_services/UcpModel.interface.mjs";
import Wave from "../3_services/Wave.interface.mjs";
import { z } from "zod";
import DefaultParticle from "./DefaultParticle.class.mjs";
import DefaultWave from "./DefaultWave.class.mjs";
import { BaseThing, DefaultIOR, ExtendedPromise } from "ior:esm:/tla.EAM.Once[dev-merge]";
import EventService, { DefaultEventService } from "ior:esm:/tla.EAM.Once.EventService[build]";


export const UcpModelProxySchema = z.object({
    _helper: z.object({
        changelog: z.any(), // TODO Replace with Changelog interface
        validate: z.function().args(z.string(), z.any()).returns(z.object({ success: z.boolean(), data: z.any().optional(), error: z.any() })),
        multiSet: z.function(),
        _proxyTools: z.object({
            loadIOR: z.function(),
            destroy: z.function().returns(z.void()),
            isProxy: z.boolean(),
            myUcpModel: z.any(),
            createMode: z.boolean(),
            proxyPath: z.string().array(),
            schema: z.any()
        })
    }).optional()
});

const iorSchema = z.object({ load: z.function().args(z.any()), href: z.string() });
export const UcpModelProxyIORSchema = z.union([z.string().regex(/^ior:/), iorSchema, z.object({ IOR: iorSchema }), z.promise(z.any())]).describe("IOR Object")

type internalIOR = z.infer<typeof UcpModelProxyIORSchema>


//type UcpModelSchemaConverterOptions = { optional: boolean }
// export function UcpModelSchemaConverter<T>(schema: T, options: UcpModelSchemaConverterOptions): T {
//     let schemaBottom = getSchemaBottom(schema);
//     let type = schemaBottom._def.typeName
//     if (type === 'ZodObject') {
//         // //@ts-ignore
//         // if (!schema.shape) return schema;
//         // //@ts-ignore
//         // for (let [key, element] of Object.entries(schema.shape)) {
//         //     //@ts-ignore
//         //     schema.setKey(key, UcpModelSchemaConverter(element, options));
//         // }
//         const extendSchema = options?.optional ? UcpModelProxySchema.optional() : UcpModelProxySchema;
//         //@ts-ignore
//         schema = schema.merge(extendSchema);
//     }
//     return schema;
// }

export class DefaultUcpModelChangeLog implements UcpModelChangelog {
    [key: string]: UcpModelChangelog | Wave;

}


function getSchemaBottom(schema: z.ZodFirstPartySchemaTypes): z.ZodFirstPartySchemaTypes {
    if ("innerType" in schema._def) {
        return getSchemaBottom(schema._def.innerType);
    }
    return schema;
}


class UcpModelMapProxy extends Map {
    _helper: any;
    private _getKey4Any(key: any): any {
        const schema = getSchemaBottom(this._helper._proxyTools.schema) as z.ZodMap;
        if (schema._def.keyType.description === 'IOR Object') {

            if (typeof key == 'object') {
                if (key instanceof DefaultIOR) {
                    return key.href;
                }
                if (key.IOR && key.IOR instanceof DefaultIOR) {
                    return key.IOR.href;
                }
            }
            if (typeof key === 'string' && key.startsWith('ior:')) {
                return key;
            }
            throw new Error("Not an IOR Object " + key)
        } else {
            return key;
        }
    }

    clear() {
        const proxyTools = this._helper._proxyTools;
        const ucpModel = proxyTools.myUcpModel as DefaultUcpModel<any, any>;

        let startedTransaction = false;
        if (ucpModel.transactionState === UcpModelTransactionStates.TRANSACTION_CLOSED) {
            startedTransaction = true;
            ucpModel.startTransaction();
        }

        for (const [key, value] of this) {
            const wave = new DefaultWave([...proxyTools.proxyPath, key], value, undefined, UcpModelChangeLogMethods.delete);
            ucpModel._registerChange(wave);
        }

        if (startedTransaction) {
            ucpModel.processTransaction();
        }

        return super.clear();
    }
    set(key: any, value: any) {

        const proxyTools = this._helper._proxyTools;
        const ucpModel = proxyTools.myUcpModel as DefaultUcpModel<any, any>;
        let proxyValue;
        if (ucpModel._isProxyObject(value)) {
            proxyValue = value;
        } else {
            proxyValue = ucpModel._createProxy4Data(value, [...proxyTools.proxyPath, key]);
        }

        let internalKey = this._getKey4Any(key)


        // If the is still in creation no reports are send
        if (this._helper._proxyTools.createMode) {
            return super.set(internalKey, proxyValue);
        } else {

            let from: any;
            let method: UcpModelChangeLogMethods = UcpModelChangeLogMethods.create;

            if (this.has(internalKey)) {
                from = this.get(internalKey);
                method = UcpModelChangeLogMethods.set;
            }

            const wave = new DefaultWave([...proxyTools.proxyPath, internalKey], from, proxyValue, method);


            const result = super.set(internalKey, proxyValue);


            ucpModel._registerChange(wave)
            return result;

        }
    }

    delete(key: any) {

        let internalKey = this._getKey4Any(key)

        // Dose not exists
        if (!this.has(internalKey)) return true;

        const proxyTools = this._helper._proxyTools;
        const ucpModel = proxyTools.myUcpModel as DefaultUcpModel<any, any>;

        //@ToDo Check if writeable

        const wave = new DefaultWave([...proxyTools.proxyPath, internalKey], this.get(internalKey), undefined, UcpModelChangeLogMethods.delete);
        ucpModel._registerChange(wave);


        return super.delete(internalKey);
    }
    entries() {
        return super.entries();
    }
    get(key: any) {
        let internalKey = this._getKey4Any(key)

        return super.get(internalKey);
    }


}
class UcpModelObjectProxy {
    _helper: any;
}

class UcpModelArrayProxy extends Array {
    _helper: any;
}

export default class DefaultUcpModel<ModelDataType, UcpComponentInterface> extends BaseThing<UcpModel> implements UcpModel {
    readonly ucpComponent: UcpComponent<ModelDataType, UcpComponentInterface>
    public loadOnAccess: boolean = true;

    protected _data!: ModelDataType;
    protected _transactionState: UcpModelTransactionStates = UcpModelTransactionStates.TRANSACTION_CLOSED;
    protected _history: Particle[] = [];


    constructor(defaultData: any, ucpComponent: UcpComponent<ModelDataType, any>) {
        super();
        this.ucpComponent = ucpComponent;
        this.model = defaultData;
    }

    get version(): string {
        return this.latestParticle.id;
    }

    toUDEStructure(): ParticleUDEStructure {
        const data = this.deepCopy(this.model);
        return {
            data,
            version: this.version,
            predecessorVersion: "Not Implemented",
            time: this.latestParticle.time
        }
    }

    EVENT_NAMES = UcpModelEvents;

    get eventSupport(): EventService<keyof this["EVENT_NAMES"]> {
        if (this._eventSupport === undefined) {
            this._eventSupport = new DefaultEventService(this)
        }
        return this._eventSupport;
    }

    get toJSON(): string {
        let loadOnAccess = this.loadOnAccess;
        this.loadOnAccess = false;
        let result = JSON.stringify(this.deepCopy(this.model))
        this.loadOnAccess = loadOnAccess;
        return result;
    }


    public _createProxy4Data(originalData: any, proxyPath: string[] = [], schema?: z.ZodFirstPartySchemaTypes) {

        if (schema === undefined) schema = this.getSchema(proxyPath);

        if (schema instanceof z.ZodUndefined) {
            throw new Error(`Missing the schema for the path ${proxyPath.join('.')}`);
        }

        const bottomSchema = getSchemaBottom(schema);
        const type = bottomSchema._def.typeName;

        let dataStructure: any;
        let requireProxy = true;
        switch (type) {
            case z.ZodFirstPartyTypeKind.ZodBoolean:
            case z.ZodFirstPartyTypeKind.ZodNumber:
            case z.ZodFirstPartyTypeKind.ZodString:
                return originalData;
            case z.ZodFirstPartyTypeKind.ZodObject:
                dataStructure = new UcpModelObjectProxy();
                break;
            case z.ZodFirstPartyTypeKind.ZodArray:
                dataStructure = new UcpModelArrayProxy();
                break;
            case z.ZodFirstPartyTypeKind.ZodMap:
                dataStructure = new UcpModelMapProxy();
                requireProxy = false;
                break;
            case z.ZodFirstPartyTypeKind.ZodUnion:
                if (bottomSchema.description === 'IOR Object') {
                    if (typeof originalData === 'string') {
                        return new DefaultIOR().init(originalData);
                    }
                    return originalData;
                }
            default:
                throw new Error(`Type ${type} is not implemented`)
        }

        if (typeof originalData !== 'object') throw new Error(`Type ${type} expected. Got a ${typeof originalData}`)

        let proxyObject: any;
        const handlerConfig = { proxyPath: proxyPath, createMode: true, schema };
        if (requireProxy) {
            const handler = this.proxyHandlerFactory(handlerConfig);
            proxyObject = new Proxy(dataStructure, handler);
        } else {
            proxyObject = dataStructure;
        }

        const helperConfig = { proxyPath, innerDataStructure: dataStructure, proxyObject, schema, createMode: true }
        dataStructure._helper = this.proxyHelperFactory(helperConfig);

        proxyObject._helper.multiSet(originalData);

        handlerConfig.createMode = false;
        helperConfig.createMode = false;
        return proxyObject;
    }

    public _registerChange(waveObject: Wave): void {
        const state = this._transactionState;
        switch (state) {
            case UcpModelTransactionStates.TRANSACTION_CLOSED:
                this.startTransaction();
                this.latestParticle.addChange(waveObject);
                this.processTransaction();
                break;
            case UcpModelTransactionStates.TRANSACTION_ROLLBACK:
                // Nothing to do in this state
                break;
            case UcpModelTransactionStates.TRANSACTION_OPEN:
                this.latestParticle.addChange(waveObject);
                break;

            default:
                throw new Error("Not implemented yet " + state);

        }

        this.eventSupport.fire(UcpModelEvents.ON_MODEL_LOCAL_CHANGED, waveObject);

    }

    startTransaction(): boolean {
        if (this.transactionState === UcpModelTransactionStates.TRANSACTION_CLOSED) {
            let particle = new DefaultParticle();

            particle.predecessorId = this._history[this._history.length - 1]?.id;
            this._history.push(particle);
            this._transactionState = UcpModelTransactionStates.TRANSACTION_OPEN;
            return true;
        } else {
            return false;
        }
    }

    private deepCopy(value: any, key?: any): any {
        if (value === undefined) return undefined;
        if (typeof value === 'object') { }

        if (typeof value === 'object') {
            if (key === '_helper') return undefined;

            if (value instanceof UcpModelMapProxy) return [...value]
            if (value instanceof Map) return [...value];

            // UDE Object
            if (value.classDescriptor && value.IOR) return value.IOR.href;

            const toJSON = value?.toJSON || value?.IOR?.toJSON;
            if (typeof toJSON !== 'undefined') return toJSON

            const result: any = Array.isArray(value) ? [] : {};
            for (const key in value) {
                result[key] = this.deepCopy(value[key], key);
            }

            return result;
        }

        return value;
    }

    processTransaction() {

        let particle = this.latestParticle;

        this._transactionState = UcpModelTransactionStates.BEFORE_CHANGE;

        //TODO: catch error
        this.eventSupport.fire(UcpModelEvents.ON_MODEL_WILL_CHANGE, this.latestParticle.changelog);
        let schema = this.getSchema();

        let parseResult = schema.safeParse(this._data);
        if (parseResult.success === false) {

            throw parseResult.error;
        }

        this._transactionState = UcpModelTransactionStates.AFTER_CHANGE;


        this.eventSupport.fire(UcpModelEvents.ON_MODEL_CHANGED, this.latestParticle.changelog);

        particle.modelSnapshot = this.deepCopy(this.model);

        this._transactionState = UcpModelTransactionStates.TRANSACTION_CLOSED;

    }

    rollbackTransaction(): void {
        this._transactionState = UcpModelTransactionStates.TRANSACTION_ROLLBACK;

        let deletedParticle = this._history.pop();
        if (deletedParticle) {

            if (deletedParticle.waveList.length > 0) {
                // TODO@BE Check what the Problem with this interface is
                //this.model._helper._proxyTools.destroy();
                //@ts-ignore
                this.model._helper.multiSet(this.latestParticle.modelSnapshot, true)
            }
        }
        this._transactionState = UcpModelTransactionStates.TRANSACTION_CLOSED;
    }


    private get latestParticle(): Particle {
        return this._history.slice(-1)[0];
    }

    public getSchema(path: string[] = [], schema?: z.ZodFirstPartySchemaTypes): z.ZodFirstPartySchemaTypes {
        if (schema === undefined) schema = this.ucpComponent.classDescriptor.class.modelSchema as z.ZodFirstPartySchemaTypes;
        for (const element of path) {
            const bottomSchema = getSchemaBottom(schema);
            switch (bottomSchema._def.typeName) {
                case z.ZodFirstPartyTypeKind.ZodObject:
                    if ("shape" in bottomSchema) {
                        const newSchema: z.ZodFirstPartySchemaTypes = bottomSchema.shape?.[element];
                        if (newSchema == undefined) return z.undefined();
                        schema = newSchema;
                        break;
                    }
                case z.ZodFirstPartyTypeKind.ZodArray:
                    if (Number.isNaN(element)) throw new Error(`Can not Access key ${element} on an Array`);
                    if ("element" in bottomSchema) {
                        schema = bottomSchema.element as z.ZodFirstPartySchemaTypes;
                        break;
                    }
                case z.ZodFirstPartyTypeKind.ZodMap:
                    if ("valueType" in bottomSchema._def) {
                        schema = bottomSchema._def.valueType;
                        break;
                    }
                default:
                    throw new Error(`Unknown type ${bottomSchema._def.typeName} to find the schema`)
            }
        }
        return schema;
    }
    get model(): ModelDataType { return this._data }

    // any to add default Values....
    set model(newValue: ModelDataType) {
        const proxy = this._createProxy4Data(newValue);

        const wave = new DefaultWave([], this._data, proxy, (this._data ? UcpModelChangeLogMethods.set : UcpModelChangeLogMethods.create));

        this._data = proxy;
        this._registerChange(wave);
    }

    get transactionState() {
        return this._transactionState;
    }


    destroy(): void {
        //@ts-ignore
        this.model._helper._proxyTools.destroy();
        //@ts-ignore
        delete this._data;
        //@ts-ignore
        delete this._history;
        super.destroy();
    }


    get changelog(): any { // TODO sollte UcpModelChangeLog | undefined sein. Aber das funktioniert nicht
        return this.latestParticle.changelog;
    };

    getChangelog(path: string[] = []): UcpModelChangelog | undefined {
        let changelog = this.latestParticle.changelog;
        for (const key of path) {
            if (changelog.hasOwnProperty(key)) {
                //@ts-ignore
                changelog = changelog[key];
            } else {
                return undefined;
            }
        }
        return changelog;

    }

    private proxyHelperFactory(config: { proxyPath: string[], innerDataStructure: any, proxyObject: any, schema: any, createMode: boolean }) {
        const ucpModel = this;
        const proxyPath = config.proxyPath;
        const innerDataStructure = config.innerDataStructure;
        const proxyObject = config.proxyObject;
        return {
            validate(key: string, value: any): z.SafeParseReturnType<any, any> {
                const parameterSchema = ucpModel.getSchema([key], config.schema)
                if (!parameterSchema) {
                    throw new Error(`Key "${key}" is not defined in the schema`);
                }

                return parameterSchema.safeParse(value);
            },
            get changelog() { return ucpModel.getChangelog(proxyPath) },
            _proxyTools: {
                isProxy: true,
                get myUcpModel() { return ucpModel },
                destroy: () => {
                    Object.keys(innerDataStructure).forEach(key => {
                        if (ucpModel._isProxyObject(innerDataStructure[key]) === true) {
                            innerDataStructure[key]?._helper?._proxyTools.destroy();
                        }
                        delete innerDataStructure[key];
                    });
                }, loadIOR() {
                    throw new Error("Not implemented yet");
                },
                get createMode() { return config.createMode },
                get proxyPath() { return proxyPath },
                get schema() { return config.schema }
            },
            multiSet(data2Set: any, forceOverwrite: boolean = false) {
                let startedTransaction = false;
                if (!config.createMode) {
                    startedTransaction = ucpModel.startTransaction();
                }

                if (proxyObject instanceof UcpModelMapProxy) {
                    let allKeys: { [index: string | number]: boolean } = {};
                    for (const [key, value] of data2Set) {
                        allKeys[key] = true;
                        proxyObject.set(key, value);
                    }

                    if (forceOverwrite) {
                        for (const [key] of innerDataStructure) {
                            if (allKeys[key] !== true && key != '_helper') proxyObject.delete(key);
                        }
                    }
                } else {

                    for (const key of Object.keys(data2Set)) {
                        if (key === '_helper') return;
                        let newValue = data2Set[key];

                        if (proxyObject[key] && typeof proxyObject[key]._helper?.multiSet === 'function') {
                            proxyObject[key]._helper.multiSet(newValue, forceOverwrite);
                        } else {
                            proxyObject[key] = newValue;
                        }
                    };

                    if (forceOverwrite) {
                        for (const key in Object.keys(innerDataStructure)) {
                            if (typeof data2Set[key] == "undefined" && key != '_helper') delete proxyObject[key];
                        }
                    }
                }

                if (startedTransaction === true) ucpModel.processTransaction();
            }

        }
    }

    private _proxyGet(target: any, key: any) {
        const value = target[key];
        if (value == undefined) return undefined;

        // TODO@BE Change to runtime interface
        if (value instanceof DefaultIOR) {
            if ([UcpModelTransactionStates.TRANSACTION_CLOSED, UcpModelTransactionStates.TRANSACTION_OPEN].includes(this._transactionState) && this.loadOnAccess === true) {
                return value.load();
            }
        }

        return value;
    }

    public _isProxyObject(object: any): boolean {
        if (object?._helper?._proxyTools?.isProxy === true) {
            if (object._helper._proxyTools.myUcpModel !== this) {
                throw new Error("It is not allowed to put Proxy objects into other Models");
            }
            return true;
        }
        return false;
    }

    private _proxySet(target: any, property: any, value: any, receiver: any, config: { proxyPath: string[], createMode: boolean, schema: any }): boolean {
        if (Array.isArray(target) === true && property === 'length') {
            target[property] = value;
        }

        // Already the same value
        if (value === target[property]) {
            return true;
        }

        // Allow Promises to be written directly to the Model. No Transaction is started
        if (ExtendedPromise.isPromise(value)) {
            const originalValue = target[property];
            target[property] = value;
            value.then((x: any) => {
                receiver[property] = x;
            }
            ).catch((e: any) => {
                target[property] = originalValue;
            });
            return true;
        }

        //@ToDo Check if writeable

        let proxyValue;
        if (this._isProxyObject(value)) {
            proxyValue = value;
        } else {

            proxyValue = this._createProxy4Data(value, [...config.proxyPath, property], this.getSchema([property], config.schema));
        }

        // If the is still in creation no reports are send
        if (config.createMode) {
            target[property] = proxyValue;
        } else {

            let from: any;
            let method: UcpModelChangeLogMethods = UcpModelChangeLogMethods.create;

            if (target.hasOwnProperty(property)) {
                from = target[property];
                method = UcpModelChangeLogMethods.set;
            }

            let waveObject = new DefaultWave([...config.proxyPath, property], from, proxyValue, method);


            //this._checkForIOR(proxyValue);
            target[property] = proxyValue;

            this._registerChange(waveObject)


        }
        return true;
    }

    private _proxyDelete(target: any, property: any, config: { proxyPath: string[], createMode: boolean }): boolean {
        // Dose not exists
        if (!target.hasOwnProperty(property)) return true;

        //@ToDo Check if writeable

        let waveObject = new DefaultWave([...config.proxyPath, property], target[property], undefined, UcpModelChangeLogMethods.delete);
        this._registerChange(waveObject)

        if (Array.isArray(target)) {
            target.splice(property, 1);
        } else {
            delete target[property];
        }

        return true;
    }

    private proxyHandlerFactory(config: { proxyPath: string[], createMode: boolean, schema: any }) {
        const ucpModel = this;
        return {
            get: (target: any, key: any): any => {
                return ucpModel._proxyGet(target, key);
            },
            set: (target: any, property: any, value: any, receiver: any): boolean => {
                return ucpModel._proxySet(target, property, value, receiver, config)
            },
            deleteProperty: (target: any, property: any) => {
                return ucpModel._proxyDelete(target, property, config)

            },
            has: (target: any, prop: any) => {
                if (target[prop] && prop !== '_helper') { return true; }
                return false;
            },
            ownKeys: (target: any) => {
                return Reflect.ownKeys(target).filter(key => key !== '_helper');
            }

        }
    }

}


