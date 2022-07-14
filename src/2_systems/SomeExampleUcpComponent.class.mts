import UcpComponent from "../3_services/UcpComponent.interface.mjs";
import UcpModel from "../3_services/UcpModel.interface.mjs";
import DefaultUcpModel, { UcpModelProxyIORSchema, UcpModelProxySchema } from "./DefaultUcpModel.class.mjs";
import BaseUcpComponent from "../1_infrastructure/BaseUcpComponent.class.mjs";
import { z } from "ior:esm:/dev.zod[test-component]";
import { ClassDescriptor } from "ior:esm:/tla.EAM.Once[build]";



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

// const convertedModelSchema = convert(modelSchema) //.merge(UcpModelProxySchema);


// const mySchema = z.object({
//     myString: z.string().min(5),
//     myUnion: z.union([z.number(), z.boolean()]),
// });

// function convert<T extends z.ZodFirstPartySchemaTypes>(schema: T): T {
//     if ("merge" in schema) {
//         schema.merge(UcpModelProxySchema);
//     }
//     return schema;
// }

//const convertedModelSchema = UcpModelSchemaConverter(modelSchema, { optional: false })



type ModelDataType = z.infer<typeof modelSchema>


@ClassDescriptor.componentExport('namedExport')
export default class SomeExampleUcpComponent extends BaseUcpComponent<ModelDataType, MyExampleUcpComponent> implements MyExampleUcpComponent {
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
}




