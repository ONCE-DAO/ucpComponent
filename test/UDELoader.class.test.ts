import { DefaultIOR, IOR, UUiD } from "ior:esm:/tla.EAM.Once[build]";
import SomeExampleUcpComponent from "../src/2_systems/SomeExampleUcpComponent.class.mjs";
import UDELoader from "../src/2_systems/UDELoader.class.mjs";


describe("UDE Loader", () => {


    test("init", async () => {
        let loader = UDELoader.factory();
        expect(loader).toBeInstanceOf(UDELoader);
    })

    test("factory", async () => {
        let loader = UDELoader.factory();
        let loader2 = UDELoader.factory();

        expect(loader).toEqual(loader2);
    })

    test("canHandle ude", async () => {

        const ior = new DefaultIOR().init("ior:ude:localhost/UDE/12345")
        let result = UDELoader.canHandle(ior);

        expect(result).toBe(1);
    })

    test("canHandle negative", async () => {

        const ior = new DefaultIOR().init("ior:localhost/UDE/12345")
        let result = UDELoader.canHandle(ior);

        expect(result).toBe(0);
    })

    test("Store create => load => load => delete", async () => {

        this
        let ucpComponent = new SomeExampleUcpComponent();
        await ucpComponent.initPersistanceManager();
        await ucpComponent.persistanceManager.create();


        let ucpComponentClone = await ucpComponent.IOR.clone().load();
        expect(ucpComponent).toEqual(ucpComponentClone);

        let ucpComponentClone2 = await ucpComponent.IOR.clone().load();
        expect(ucpComponentClone2).toEqual(ucpComponentClone);

        await ucpComponent.persistanceManager.delete();


    })

    test("Store create => delete (Store cleaned)", async () => {

        this
        let ucpComponent = new SomeExampleUcpComponent();
        await ucpComponent.initPersistanceManager();

        await ucpComponent.persistanceManager.create();

        await ucpComponent.persistanceManager.delete();

        try {
            await ucpComponent.IOR.clone().load();
            throw new Error("Missing Error");
        } catch (e) {
            //@ts-ignore
            expect(e.message).toBe("No file Found");
        }

    })

    test("Load with Alias", async () => {

        let ucpComponent = new SomeExampleUcpComponent();
        await ucpComponent.initPersistanceManager();

        const myAlias = expect.getState().currentTestName + Math.round(Math.random() * 100000);
        ucpComponent.persistanceManager.addAlias(myAlias)
        await ucpComponent.persistanceManager.create();

        let loadIOR = ucpComponent.IOR.clone();
        loadIOR.id = myAlias;


        let ucpComponentClone = await loadIOR.load();
        expect(ucpComponent).toBe(ucpComponentClone);

        await ucpComponent.persistanceManager.delete();


    })

    // Need Webserve
    // let server: OnceWebserver;
    // let ior: IOR | undefined;
    // afterEach(async () => {

    //     if (ior) {
    //         let client = DefaultClient.findClient(ior) as CRUD_Client;
    //         await client.delete(ior);
    //         ior = undefined;
    //     }

    //     if (server && server.stop)
    //         await server.stop();



    // })


    // describe("UDE Loader over http", () => {
    //     test("Load with Alias", async () => {

    //         server = new OnceWebserver();

    //         await server.start();


    //         let onceConfigIOR = new DefaultIOR().init("ior:rest:http://localhost:3000/UDE/onceConfig")
    //         let client = DefaultClient.findClient(onceConfigIOR) as CRUD_Client;

    //         let result = await client.retrieve(onceConfigIOR);

    //         expect(result.ok).toBe(true);

    //         expect(result.parsedData.alias).toStrictEqual(["onceConfig"]);

    //     })

    //     test("create with Alias", async () => {


    //         const id = UUiD.uuidv4();

    //         let udeObject = {
    //             "id": id,
    //             "instanceIOR": "ior:ude:http://localhost:3000/UDE/" + id,
    //             "typeIOR": "ior:esm:git:/tla.EAM.once.ts[0.0.1]/DefaultOnceConfig",
    //             "particle": {
    //                 "data": {
    //                     "_component": { "name": "DefaultOnceConfig" },
    //                     "hostname": "someHost",
    //                     "port": 8443,
    //                     "protocol": "https"
    //                 },
    //                 "version": "15dc4d9a-731f-41ff-91e1-8b6c37760a78",
    //                 "predecessorVersion": "Not Implemented",
    //                 "time": Date.now(),
    //             },
    //             "alias": ["test_create_with_Alias"]
    //         }

    //         server = new OnceWebserver();

    //         await server.start();
    //         ior = new DefaultIOR().init("ior:ude:http://localhost:3000/UDE/test_create_with_Alias");

    //         let createIOR = new DefaultIOR().init("ior:rest:http://localhost:3000/UDE")
    //         let client = DefaultClient.findClient(createIOR) as CRUD_Client;

    //         let result = await client.create(createIOR, udeObject);
    //         expect(result.ok, result.statusText).toBe(true);



    //         expect(result.parsedData.id).toStrictEqual(udeObject.id);
    //         expect(result.parsedData.alias).toStrictEqual(udeObject.alias);
    //         expect(result.parsedData.particle.data).toStrictEqual(udeObject.particle.data);

    //     })

    //     test("Delete with Alias", async () => {


    //         const id = UUiD.uuidv4();

    //         ior = new DefaultIOR().init("ior:ude:http://localhost:3000/UDE/test_delete_with_Alias");
    //         let udeObject = {
    //             "id": id,
    //             "instanceIOR": "ior:ude:http://localhost:3000/UDE/" + id,
    //             "typeIOR": "ior:esm:git:/tla.EAM.once.ts[0.0.1]/DefaultOnceConfig",
    //             "particle": {
    //                 "data": {
    //                     "_component": { "name": "DefaultOnceConfig_Loaded!!!!" },
    //                     "hostname": "someHost",
    //                     "port": 8443,
    //                     "protocol": "https"
    //                 },
    //                 "version": "15dc4d9a-731f-41ff-91e1-8b6c37760a78",
    //                 "predecessorVersion": "Not Implemented",
    //                 "time": Date.now(),
    //             },
    //             "alias": ["test_delete_with_Alias"]
    //         }

    //         server = new OnceWebserver();

    //         await server.start();

    //         let createIOR = new DefaultIOR().init("ior:rest:http://localhost:3000/UDE")
    //         let client = DefaultClient.findClient(createIOR) as CRUD_Client;

    //         let result = await client.create(createIOR, udeObject);
    //         expect(result.ok, result.statusText).toBe(true);



    //         let deleteResult = await client.delete(ior);
    //         expect(deleteResult.ok, result.statusText).toBe(true);


    //     })

    //     test("update with Alias", async () => {


    //         const id = UUiD.uuidv4();

    //         let udeObject = {
    //             "id": id,
    //             "instanceIOR": "ior:ude:http://localhost:3000/UDE/" + id,
    //             "typeIOR": "ior:esm:git:/tla.EAM.once.ts[0.0.1]/DefaultOnceConfig",
    //             "particle": {
    //                 "data": {
    //                     "_component": { "name": "DefaultOnceConfig_Loaded!!!!" },
    //                     "hostname": "someHost",
    //                     "port": 8443,
    //                     "protocol": "https"
    //                 },
    //                 "version": "15dc4d9a-731f-41ff-91e1-8b6c37760a78",
    //                 "predecessorVersion": "Not Implemented",
    //                 "time": Date.now(),
    //             },
    //             "alias": ["test_update_with_Alias"]
    //         }

    //         server = new OnceWebserver();

    //         await server.start();
    //         ior = new DefaultIOR().init("ior:ude:http://localhost:3000/UDE/test_update_with_Alias");

    //         let createIOR = new DefaultIOR().init("ior:rest:http://localhost:3000/UDE")
    //         let client = DefaultClient.findClient(createIOR) as CRUD_Client;

    //         let result = await client.create(createIOR, udeObject);
    //         expect(result.ok, result.statusText).toBe(true);


    //         udeObject.particle.data.port = 1;
    //         let resultUpdate = await client.update(ior, udeObject);
    //         expect(resultUpdate.ok, resultUpdate.statusText).toBe(true);

    //         let resultRetrieve = await client.retrieve(ior);
    //         expect(resultUpdate.ok, resultUpdate.statusText).toBe(true);

    //         expect(resultRetrieve.parsedData.particle.data.port).toStrictEqual(1);

    //     })


    // })


})