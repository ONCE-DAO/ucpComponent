import { z } from "ior:esm:/dev.zod[test-component]";
import { Thing, InterfaceDescriptorHandler } from "ior:esm:/tla.EAM.Once[build]";
import BaseUcpComponent from "../1_infrastructure/BaseUcpComponent.class.mjs";
import UcpComponent from "../3_services/UcpComponent.interface.mjs";
import UcpModel from "../3_services/UcpModel.interface.mjs";
import DefaultUcpModel, { UcpModelProxyIORSchema, UcpModelProxySchema } from "./DefaultUcpModel.class.mjs";



interface MyExampleUcpComponent extends UcpComponent<ModelDataType, MyExampleUcpComponent> {
    myName: string | undefined;
}

const modelSchema =
    z.object({
        name: z.string(),
        myName: z.string().optional(),
        age: z.number().optional(),
        iorObject: UcpModelProxyIORSchema.optional(),
        inventory: z.object({
            name: z.string().optional(),
            itemId: z.number().optional(),
        }).array().optional(),
        subOptions: z.object({
            someString: z.string().optional(),
        }).merge(UcpModelProxySchema).optional(),
        someMap: z.map(z.string(), z.number()).optional(),
        someNumberMap: z.map(z.number(), z.number()).optional(),
        someIORMap: z.map(UcpModelProxyIORSchema, z.number()).optional()

    })
        .merge(BaseUcpComponent.modelSchema).merge(UcpModelProxySchema)
    ;

type ModelDataType = z.infer<typeof modelSchema>


export default class SomeExampleUcpComponent extends BaseUcpComponent<ModelDataType, MyExampleUcpComponent> implements MyExampleUcpComponent {
    modelSchema = modelSchema;
    get myName() { return this.model.myName }

    static get modelSchema() {
        return modelSchema;
    }

    public readonly ucpModel: UcpModel = new DefaultUcpModel<ModelDataType, MyExampleUcpComponent>(SomeExampleUcpComponent.modelDefaultData, this);


    static get modelDefaultData() {
        return {
            ...super.modelDefaultData,
            name: 'MyDefaultName'
        }
    }

    async add(object: Thing<any>): Promise<boolean> {
        if (InterfaceDescriptorHandler.isInterface<UcpComponent<any, any>>(object)) {
            object
        }
        return true;
    }
}




