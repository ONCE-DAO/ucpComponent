import { DefaultIOR, ServerSideUcpComponentDescriptorInterface } from "ior:esm:/tla.EAM.Once[dev-merge]";
import { BasePersistanceManager } from "../src/1_infrastructure/BasePersistanceManager.class.mjs";
import { FilePersistanceManager } from "../src/2_systems/FilePersistanceManager.class.mjs";
import SomeExampleUcpComponent from "../src/2_systems/SomeExampleUcpComponent.class.mjs";
import UDELoader from "../src/2_systems/UDELoader.class.mjs";
import { PersistanceManagerID } from "../src/3_services/PersistanceManager.interface.mjs";

import fs from "fs";
import path from "path";

let allFiles: string[] = [];

afterAll(() => {
    for (let file of allFiles) {
        if (fs.existsSync(file)) {
            fs.rmSync(file);
        }
    }
});

const getAlias = () => {
    return ("JestTest_" + expect.getState().currentTestName + Math.round(Math.random() * 100000)).replace(/ /g, '_');
}

describe("File PersistanceManager", () => {


    test("init", async () => {
        let ucpComponent = new SomeExampleUcpComponent();

        let pm = new FilePersistanceManager(ucpComponent);

        expect(pm).toBeInstanceOf(FilePersistanceManager);
    })

    test("correct UcpComponentDescriptor", async () => {
        let ucpComponent = new SomeExampleUcpComponent();

        let cd = ucpComponent.classDescriptor.ucpComponentDescriptor;

        expect(cd.name).toBe('UcpComponent');
    })


    test("find File PersistanceManager", async () => {
        let ucpComponent = new SomeExampleUcpComponent();

        let pm = BasePersistanceManager.getPersistenceManager(ucpComponent);

        expect(pm).toBeInstanceOf(FilePersistanceManager);
    })

    test("ucpComponent Persistance Manager", async () => {
        let ucpComponent = new SomeExampleUcpComponent();

        let pm = ucpComponent.persistanceManager;

        expect(ucpComponent.Store.lookup(PersistanceManagerID).length).toBe(1);

        expect(pm.list.length).toBeGreaterThan(-1);
        expect(pm.list[0]).toBeInstanceOf(FilePersistanceManager);
    })

    test("FileName endsWith .scenario.json", async () => {
        let ucpComponent = new SomeExampleUcpComponent();

        let pm = ucpComponent.persistanceManager.list[0] as FilePersistanceManager;

        expect(pm.fileName().endsWith('.scenario.json')).toBe(true);
    })

    test("FilePath in Scenario", async () => {
        let ucpComponent = new SomeExampleUcpComponent();

        let pm = ucpComponent.persistanceManager.list[0] as FilePersistanceManager;

        const filePath = pm.filePath();
        // TODO PB merge
        // @ts-ignore
        const matchPath = path.join(ONCE.eamd.scenario.eamdPath, ONCE.eamd.scenario.scenarioPath);
        expect(filePath.startsWith(matchPath), `${filePath} ${matchPath}`).toBe(true);

        let outputDir = (SomeExampleUcpComponent.classDescriptor.ucpComponentDescriptor as ServerSideUcpComponentDescriptorInterface).scenarioDirectory
        expect(path.dirname(filePath).endsWith(outputDir)).toBe(true);

    })

    test("create / delete", async () => {
        let ucpComponent = new SomeExampleUcpComponent();
        let id = ucpComponent.IOR.id;

        if (id === undefined) throw new Error("Missing ID")
        ucpComponent.model.age = 0;


        await ucpComponent.persistanceManager.create();


        const fpm = (ucpComponent.persistanceManager.list[0] as FilePersistanceManager);

        let filename = fpm.filePath();
        let files = await FilePersistanceManager.discover();

        expect(files[id]).toBeTruthy();


        allFiles.push(filename);

        expect(fs.existsSync(filename), 'File is Missing').toBeTruthy();

        await ucpComponent.persistanceManager.delete();
        expect(fs.existsSync(filename), 'File was not deleted').toBeFalsy();


    })

    test("update / load", async () => {
        let ucpComponent = new SomeExampleUcpComponent();

        ucpComponent.model.age = 1;
        await ucpComponent.persistanceManager.create();

        let filename = (ucpComponent.persistanceManager.list[0] as FilePersistanceManager).filePath();
        allFiles.push(filename);

        expect(fs.existsSync(filename), 'File is Missing').toBeTruthy();


        ucpComponent.model.age = 10;

        await ucpComponent.persistanceManager.update();

        let ior = new DefaultIOR().init(ucpComponent.IOR.href);

        UDELoader.factory().clearStore();

        let ucpComponentClone = await ior.load();

        expect(ucpComponentClone.model.age).toEqual(ucpComponent.model.age);

        await ucpComponent.persistanceManager.delete();
        // @ts-ignore
        expect(fs.existsSync(filename), 'File was not deleted').toBeFalsy();

    })

    test("retrieve result with Alias", async () => {
        let ucpComponent = new SomeExampleUcpComponent();


        const myAlias = getAlias();
        await ucpComponent.persistanceManager.addAlias(myAlias);

        await ucpComponent.persistanceManager.create();

        let filename = (ucpComponent.persistanceManager.list[0] as FilePersistanceManager).filePath();

        allFiles.push(filename);

        let result = await ucpComponent.persistanceManager.retrieve();

        expect(result[0]?.alias?.length).toBe(1);

        expect(result[0]?.alias?.[0]).toBe(myAlias);

    });


    test("update on Model change", async () => {
        let ucpComponent = new SomeExampleUcpComponent();


        await ucpComponent.persistanceManager.create();

        let filename = (ucpComponent.persistanceManager.list[0] as FilePersistanceManager).filePath();

        allFiles.push(filename);

        ucpComponent.model.age = 10;

        UDELoader.factory().clearStore();

        let ior = new DefaultIOR().init(ucpComponent.IOR.href);
        let ucpComponentClone = await ior.load();

        expect(ucpComponentClone.model.age).toEqual(ucpComponent.model.age);

        await ucpComponent.persistanceManager.delete();
        // @ts-ignore
        expect(fs.existsSync(filename), 'File was not deleted').toBeFalsy();


    })


    test("File starts with Alias and ends with id", async () => {
        let ucpComponent = new SomeExampleUcpComponent();

        const id = ucpComponent.IOR.id;

        const myAlias = getAlias();
        await ucpComponent.persistanceManager.addAlias(myAlias);

        let filename = (ucpComponent.persistanceManager.list[0] as FilePersistanceManager).filePath();

        let fileList = filename.split('/');
        let file = fileList[fileList.length - 1];

        expect(file).toBe(myAlias + '.' + id + FilePersistanceManager.fileEnding);
    });

    test("add Alias before create", async () => {
        let ucpComponent = new SomeExampleUcpComponent();


        const myAlias = getAlias();
        await ucpComponent.persistanceManager.addAlias(myAlias);

        await ucpComponent.persistanceManager.create();

        let filename = (ucpComponent.persistanceManager.list[0] as FilePersistanceManager).filePath();

        allFiles.push(filename);

        expect(filename.match(myAlias)).toBeTruthy();

        await ucpComponent.persistanceManager.delete();
        // @ts-ignore
        expect(fs.existsSync(filename), 'File was not deleted').toBeFalsy();

    });



    test("add Alias after create", async () => {
        let ucpComponent = new SomeExampleUcpComponent();


        const myAlias = getAlias();
        await ucpComponent.persistanceManager.create();

        await ucpComponent.persistanceManager.addAlias(myAlias);


        let filename = (ucpComponent.persistanceManager.list[0] as FilePersistanceManager).filePath();


        allFiles.push(filename);

        expect(filename.match(myAlias)).toBeTruthy();

        await ucpComponent.persistanceManager.delete();
        // @ts-ignore
        expect(fs.existsSync(filename), 'File was not deleted').toBeFalsy();

    });

    test("load with Alias => load return IOR with UUID", async () => {
        let ucpComponent = new SomeExampleUcpComponent();


        const myAlias = getAlias();
        await ucpComponent.persistanceManager.addAlias(myAlias);
        await ucpComponent.persistanceManager.create();

        let filename = (ucpComponent.persistanceManager.list[0] as FilePersistanceManager).filePath();

        allFiles.push(filename);

        UDELoader.factory().clearStore();

        const aliasIOR = ucpComponent.IOR.clone();
        aliasIOR.id = myAlias;

        let componentClone = await aliasIOR.load();

        expect(componentClone.IOR.id).toBe(ucpComponent.IOR.id);

        await ucpComponent.persistanceManager.delete();
        // @ts-ignore
        expect(fs.existsSync(filename), 'File was not deleted').toBeFalsy();

    });


    test("load with Alias => get IOR with UUID in Store", async () => {
        let ucpComponent = new SomeExampleUcpComponent();


        const myAlias = getAlias();
        await ucpComponent.persistanceManager.addAlias(myAlias);
        await ucpComponent.persistanceManager.create();

        let filename = (ucpComponent.persistanceManager.list[0] as FilePersistanceManager).filePath();

        allFiles.push(filename);

        UDELoader.factory().clearStore();

        const aliasIOR = ucpComponent.IOR.clone();
        aliasIOR.id = myAlias;

        let componentClone = await aliasIOR.load();

        //@ts-ignore
        let storedObject = await UDELoader.factory().instanceStore.lookup(ucpComponent.IOR.href)

        expect(storedObject).toBe(componentClone);

        await ucpComponent.persistanceManager.delete();
        // @ts-ignore
        expect(fs.existsSync(filename), 'File was not deleted').toBeFalsy();

    });

    test("Remove Alias", async () => {
        let ucpComponent = new SomeExampleUcpComponent();

        const id = ucpComponent.IOR.id;

        const myAlias = getAlias();
        await ucpComponent.persistanceManager.addAlias(myAlias);


        await ucpComponent.persistanceManager.removeAlias(myAlias);

        let filename = (ucpComponent.persistanceManager.list[0] as FilePersistanceManager).filePath();



        let fileList = filename.split('/');
        let file = fileList[fileList.length - 1];

        expect(file).toBe(id + FilePersistanceManager.fileEnding);

    });

    test("Add alias with . => Error", async () => {
        let ucpComponent = new SomeExampleUcpComponent();

        try {
            await ucpComponent.persistanceManager.addAlias('some.test');
            throw new Error("Missing Error");
        } catch (err) {
            //@ts-ignore
            expect(err.message).toBe("No '.' are allowed in alias")
        }

    });

})