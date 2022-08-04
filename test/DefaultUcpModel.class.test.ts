import { DefaultIOR, UUiD, ExtendedPromise } from "ior:esm:/tla.EAM.Once[build]";
import { UcpModelProxyIORSchema } from "../src/2_systems/DefaultUcpModel.class.mjs";
import SomeExampleUcpComponent from "../src/2_systems/SomeExampleUcpComponent.class.mjs";
import { UcpModelTransactionStates, UcpModelEvents, UcpModelChangeLogMethods } from "../src/3_services/UcpModel.interface.mjs";



let ucpComponent = new SomeExampleUcpComponent();
let model = ucpComponent.model;
let ucpModel = ucpComponent.ucpModel;
beforeEach(async () => {

    ucpComponent = new SomeExampleUcpComponent();
    model = ucpComponent.model;
    ucpModel = ucpComponent.ucpModel;
});



describe("Default Ucp Model", () => {

    test("int", async () => {

        expect(ucpComponent.model).toMatchObject(SomeExampleUcpComponent.modelDefaultData);

        //@ts-ignore Look into protected
        expect(ucpModel._history.length).toBe(1);

    })
    describe("Transaction", () => {

        test("Start", async () => {
            ucpModel.startTransaction();
            expect(ucpModel.transactionState).toBe(UcpModelTransactionStates.TRANSACTION_OPEN);
        })

        test("Process", async () => {
            //init();
            ucpModel.startTransaction();
            model.age = 10;

            //@ts-ignore Look into protected
            expect(ucpModel.latestParticle.modelSnapshot).toBe(undefined);
            ucpModel.processTransaction();

            //@ts-ignore Look into protected
            expect(ucpModel._history.length).toBe(2);
            expect(ucpModel.transactionState).toBe(UcpModelTransactionStates.TRANSACTION_CLOSED);
            //@ts-ignore Look into protected
            expect(ucpModel.latestParticle.modelSnapshot.age).toBe(10);
        })

        test("Rollback", async () => {

            model.age = 5;

            ucpModel.startTransaction();
            model.age = 10;

            expect(model.age).toBe(10);
            ucpModel.rollbackTransaction();

            expect(ucpComponent.model.age).toBe(5);
        })

        test("Rollback without a change", async () => {

            model.age = 5;

            //@ts-ignore check internals
            expect(ucpModel._history.length).toBe(2);

            ucpModel.startTransaction();

            //@ts-ignore check internals
            expect(ucpModel._history.length).toBe(3);

            ucpModel.rollbackTransaction();

            expect(model).toBe(ucpModel.model);
        })

        test("Multi Changes in one Transaction", async () => {

            model.age = 5;
            expect(ucpModel.transactionState).toBe(UcpModelTransactionStates.TRANSACTION_CLOSED);
            expect(ucpModel.changelog).toMatchObject({ "age": { "from": undefined, "key": ["age"], "method": "create", "to": 5 } });

            ucpModel.startTransaction();
            expect(ucpModel.transactionState).toBe(UcpModelTransactionStates.TRANSACTION_OPEN);
            //@ts-ignore
            expect(ucpModel.latestParticle.modelSnapshot).toBe(undefined);
            //@ts-ignore
            const transactionId = ucpModel.latestParticle.id;

            model.age = 10;
            expect(ucpModel.transactionState).toBe(UcpModelTransactionStates.TRANSACTION_OPEN);

            model._helper?.multiSet({ myName: 'test', subOptions: { someString: 'test' } });
            expect(ucpModel.transactionState).toBe(UcpModelTransactionStates.TRANSACTION_OPEN);

            //@ts-ignore
            expect(ucpModel.latestParticle.id).toBe(transactionId);
            ucpModel.processTransaction();
            expect(ucpModel.transactionState).toBe(UcpModelTransactionStates.TRANSACTION_CLOSED);
            expect(ucpModel.changelog).toMatchObject(
                {
                    "age": { "from": 5, "key": ["age"], "method": "set", "to": 10 },
                    "myName": { "from": undefined, "key": ["myName"], "method": "create", "to": "test" }
                }
            );

        })

    })
    describe("Model Functions", () => {
        test("destroy", async () => {

            model.age = 5;

            ucpModel.destroy();
            expect(ucpModel.model).toBe(undefined);
            expect(() => { ucpModel.changelog }).toThrowError(/Cannot read properties of undefined/);
            expect(ucpModel.toJSON).toBe(undefined);

        })

        test("toJSON", async () => {

            model.age = 5;
            model.inventory = [{ name: 'test', itemId: 5 }, { name: 'test2', itemId: 35 }];
            model.iorObject = new DefaultIOR().init('https://test.wo-da.de');

            expect(ucpModel.toJSON).toBe('{"_component":{"name":"SomeExampleUcpComponent"},"name":"MyDefaultName","age":5,"inventory":[{"name":"test","itemId":5},{"name":"test2","itemId":35}],"iorObject":"ior:https://test.wo-da.de"}');

        })

        test("deepCopy", async () => {
            //@ts-ignore Access internals
            const deepCopy = ucpModel.deepCopy;

            let result = deepCopy(new Map([["my", 'test']]));

            expect(result).toStrictEqual([["my", 'test']]);
        })

        test("toUDEStructure", async () => {
            ucpComponent.model.age = 1;
            const data = ucpModel.toUDEStructure();

            expect(data.data.age).toEqual(1);
            expect(data.data.name).toEqual("MyDefaultName");

            expect(UUiD.isUuidv4(data.version)).toBe(true);
        })
    })
    describe("Events", () => {
        test("Event onModelWillChange", async () => {

            let result: any;
            const callback = (event: any, data: any) => {
                result = data;
                expect(ucpModel.transactionState).toBe(UcpModelTransactionStates.BEFORE_CHANGE);
            }

            ucpModel.eventSupport.addEventListener(UcpModelEvents.ON_MODEL_WILL_CHANGE, callback, ucpModel)
            model.age = 10;

            expect(result).not.toBe(undefined);
        })

        test("Event onModelChanged", async () => {

            let result: any;
            const callback = (event: any, data: any) => {
                result = data;
                expect(ucpModel.transactionState).toBe(UcpModelTransactionStates.AFTER_CHANGE);
            }

            ucpModel.eventSupport.addEventListener(UcpModelEvents.ON_MODEL_CHANGED, callback, ucpModel)
            model.age = 10;

            expect(result).not.toBe(undefined);
        })

        test("Event onModelLocalChanges", async () => {

            let count: number = 0;
            const callback = (event: any, data: any) => {
                count++;
            }

            ucpModel.eventSupport.addEventListener(UcpModelEvents.ON_MODEL_LOCAL_CHANGED, callback, ucpModel);

            model.age = 1;

            ucpModel.startTransaction();
            model.age = 10;
            model.age = 2;
            ucpModel.processTransaction();

            expect(count).toBe(3);
        })

    })

    describe("Performance", () => {
        test("Get 1000000 Times a Parameter", async () => {
            model.age = 1;
            let age = 0;
            for (let i = 0; i < 1000000; i++) {
                age += model.age;
            }
            expect(age).toEqual(1000000);
        })

        test("Set 1000 Times a Parameter", async () => {
            for (let i = 0; i < 1000; i++) {
                model.age = i;
            }
            expect(model.age).toEqual(999);
        })

        test("Set 1000 Times a Parameter in one Transaction", async () => {
            ucpModel.startTransaction();
            for (let i = 0; i < 1000; i++) {
                model.age = i;
            }
            ucpModel.processTransaction();

            expect(model.age).toEqual(999);
        })

        test("Set 1000 Times a Parameter to identical Value", async () => {
            for (let i = 0; i < 1000; i++) {
                model.age = 5;
            }
            expect(model.age).toEqual(5);
        })

        test("Set 1000 a Sub Parameter", async () => {
            model.subOptions = {};
            for (let i = 0; i < 1000; i++) {
                model.subOptions.someString = '' + i;
            }
            expect(model.subOptions?.someString).toEqual("999");
        })

        test("Set 1000 Times a Parameter with multiSet", async () => {
            for (let i = 0; i < 1000; i++) {
                if (model._helper)
                    model._helper.multiSet({ age: i });
            }
            expect(model.age).toEqual(999);
        })
    })

    describe("Proxy Helper Functions", () => {

        test("_helper._proxyTools.isProxy", async () => {
            expect(model._helper?._proxyTools.isProxy).toBe(true);
        })

        test("_helper._proxyTools.myUcpModel", async () => {
            //@ts-ignore
            expect(model._helper?._proxyTools.myUcpModel).toMatchObject(ucpModel);
        })

        test("_helper._proxyTools.destroy", async () => {

            expect(model._helper?._proxyTools.destroy).toBeInstanceOf(Function);

            model._helper?._proxyTools.destroy();

            expect(model).toEqual({});

        })
        // test("_helper._proxyTools.loadIOR", async () => {
        //     expect(model._helper?._proxyTools.loadIOR).toBeInstanceOf(Function);
        // })
        test("_helper.multiSet", async () => {

            expect(ucpModel.transactionState).toBe(UcpModelTransactionStates.TRANSACTION_CLOSED);

            expect(model._helper?.multiSet).toBeInstanceOf(Function);

            model._helper?.multiSet({ age: 6, name: 'test', subOptions: { someString: 'test2' } });
            expect(ucpModel.transactionState).toBe(UcpModelTransactionStates.TRANSACTION_CLOSED);

            expect(model.age).toBe(6);
            expect(model.name).toBe('test');
        })

        test("_helper.validate", async () => {

            expect(model._helper?.validate).toBeInstanceOf(Function);

            let result = model._helper?.validate('age', 9);
            expect(result).toStrictEqual({ "data": 9, "success": true })

            let result2 = model._helper?.validate('age', 'My Name');
            expect(result2?.success).toBe(false);

            expect(result2?.error?.issues[0].message).toBe("Expected number, received string");
        })

        test("_helper.changelog", async () => {

            model.age = 100;
            expect(ucpModel.changelog).toBe(model._helper?.changelog);

            //@ts-ignore
            expect(ucpModel.getChangelog()).toBe(model?._helper?.changelog);

        })

        test("_helper.changelog subElement", async () => {

            model.inventory = [{ name: 'test', itemId: 5 }, { name: 'test2', itemId: 35 }];

            //@ts-ignore
            expect(ucpModel.getChangelog(['inventory'])).toBe(model.inventory?._helper?.changelog);
        })
    })

    describe("Change model", () => {
        describe("Basic Parameter", () => {

            test("set Parameter", async () => {
                model.age = 4;

                model.age = 5;

                let changelog = ucpModel.changelog;

                expect(changelog?.age?.to).toBe(5);
                expect(changelog?.age?.from).toBe(4);
                expect(changelog?.age?.method).toBe(UcpModelChangeLogMethods.set);

            })
            test("set sub Parameter", async () => {

                model.subOptions = {};

                model.subOptions.someString = "data";
                let changelog = ucpModel.changelog;

                expect(model.subOptions.someString).toBe("data");

                expect(changelog?.subOptions.someString?.to).toBe("data");
                expect(changelog?.subOptions.someString?.from).toBe(undefined);
                expect(changelog?.subOptions.someString?.method).toBe(UcpModelChangeLogMethods.create);

            })

            test("delete Parameter", async () => {

                model.age = 5;
                delete model.age;

                let changelog = ucpModel.changelog;

                expect(model.age).toBe(undefined);

                expect(changelog?.age?.to).toBe(undefined);
                expect(changelog?.age?.from).toBe(5);

                expect(changelog?.age?.method).toBe(UcpModelChangeLogMethods.delete);

            })
        })

        describe("Objects", () => {

            test("set sub Object", async () => {

                model.subOptions = { someString: "data" };

                expect(model.subOptions.someString).toBe("data");
                let changelog = ucpModel.changelog;

                expect(changelog?.subOptions.someString?.to).toBe("data");
                expect(changelog?.subOptions.someString?.from).toBe(undefined);
                expect(changelog?.subOptions.someString?.method).toBe(UcpModelChangeLogMethods.create);

            })

            test("delete sub Object", async () => {

                model.subOptions = { someString: "data" };

                delete model.subOptions;
                expect(model.subOptions).toBe(undefined);

                let changelog = ucpModel.changelog;
                expect(changelog).toMatchObject({ "subOptions": { "from": { "someString": "data" }, "key": ["subOptions"], "method": "delete", "to": undefined } });

            })

            test("set wrong type (Runtime Error)", async () => {

                //@ts-ignore
                expect(() => { model.subOptions = 123 }).toThrowError(/Type ZodObject expected. Got a number/);
            })

            test("set wrong type in Object (Runtime Error) ", async () => {

                //@ts-ignore
                expect(() => { model.inventory = [{ name: 'test', itemId4444: 5 }]; }).toThrowError("Missing the schema for the path inventory.0.itemId4444");
            })
        })
        describe("Array", () => {
            test("set empty Array", async () => {
                model.inventory = [];

                expect(model.inventory).toEqual([]);

            })

            test("set empty Array", async () => {

                model.inventory = [];

                expect(model.inventory).toEqual([]);

            })

            test("set filled Array", async () => {

                model.inventory = [{ name: 'test', itemId: 5 }, { name: 'test2', itemId: 35 }];

                expect(model.inventory).toEqual([{ name: 'test', itemId: 5 }, { name: 'test2', itemId: 35 }]);
                let changelog = ucpModel.changelog;
                expect(changelog?.inventory).toMatchObject(
                    {
                        "0": {
                            "itemId": { "from": undefined, "key": ["inventory", "0", "itemId"], "method": "create", "to": 5 },
                            "name": { "from": undefined, "key": ["inventory", "0", "name"], "method": "create", "to": "test" }
                        },
                        "1": {
                            "itemId": { "from": undefined, "key": ["inventory", "1", "itemId"], "method": "create", "to": 35 },
                            "name": { "from": undefined, "key": ["inventory", "1", "name"], "method": "create", "to": "test2" }
                        }
                    }
                );

            })
            test("push in Array", async () => {

                model.inventory = [];
                model.inventory.push({ name: 'test', itemId: 5 });
                model.inventory.push({ name: 'test5', itemId: 35 });

                expect(model.inventory.length).toBe(2);
                expect(model.inventory).toEqual([{ name: 'test', itemId: 5 }, { name: 'test5', itemId: 35 }]);
                let changelog = ucpModel.changelog;
                expect(changelog?.inventory).toMatchObject(
                    {
                        "1": {
                            "itemId": { "from": undefined, "key": ["inventory", "1", "itemId"], "method": "create", "to": 35 },
                            "name": { "from": undefined, "key": ["inventory", "1", "name"], "method": "create", "to": "test5" }
                        }
                    }
                );

            })

            test("pop in Array", async () => {

                model.inventory = [];
                model.inventory.push({ name: 'test', itemId: 5 });
                model.inventory.push({ name: 'test5', itemId: 35 });
                expect(model.inventory).toEqual([{ name: 'test', itemId: 5 }, { name: 'test5', itemId: 35 }]);

                model.inventory.pop();
                expect(model.inventory).toEqual([{ name: 'test', itemId: 5 }]);
                let changelog = ucpModel.changelog;
                expect(changelog?.inventory).toMatchObject({
                    "1":
                    {
                        "from": { "itemId": 35, "name": "test5" },
                        "key": ["inventory", "1"], "method": "delete", "to": undefined
                    }
                }
                );
            })

        })

        describe("Map", () => {

            test("Init Map", async () => {
                model.someMap = new Map();
                expect(model.someMap.get).toBeInstanceOf(Function)
            })

            test("Map set String Key", async () => {

                model.someMap = new Map();
                model.someMap.set('my Key', 12345);

                expect(model.someMap.get('my Key')).toBe(12345)
                expect(ucpModel.changelog).toMatchObject({ "someMap": { "my Key": { "from": undefined, "key": ["someMap", "my Key"], "method": "create", "to": 12345 } } })

            })

            test("Map delete String Key", async () => {
                model.someMap = new Map();
                model.someMap.set('my Key', 12345);
                model.someMap.delete('my Key');
                expect(model.someMap.get('my Key')).toBe(undefined);
                expect(ucpModel.changelog).toMatchObject({ "someMap": { "my Key": { "from": 12345, "key": ["someMap", "my Key"], "method": "delete", "to": undefined } } })

            })

            test("Map delete String Key", async () => {
                model.someMap = new Map();
                model.someMap.set('my Key', 12345);
                model.someMap.delete('my Key');
                expect(model.someMap.get('my Key')).toBe(undefined);
                expect(ucpModel.changelog).toMatchObject({ "someMap": { "my Key": { "from": 12345, "key": ["someMap", "my Key"], "method": "delete", "to": undefined } } })

            })

            test("Map clear", async () => {
                model.someMap = new Map();
                model.someMap.set('my Key', 12345);
                model.someMap.set('my Key2', 444444);

                model.someMap.clear();
                expect(model.someMap.get('my Key')).toBe(undefined);
                expect(ucpModel.changelog).toMatchObject({
                    "someMap": {
                        "my Key": { "from": 12345, "key": ["someMap", "my Key"], "method": "delete", "to": undefined },
                        "my Key2": { "from": 444444, "key": ["someMap", "my Key2"], "method": "delete", "to": undefined }
                    }
                });

            })

            test("multiSet", async () => {
                model.someIORMap = new Map();
                model.someIORMap.set('ior:https://test.wo-da.de', 12345);

                model._helper?.multiSet({ someIORMap: [[new DefaultIOR().init("prod.wo-da.de"), 444444]] });

                expect(model.someIORMap?.size).toBe(2);
                let entries = model.someIORMap?.entries();
                if (!entries) throw new Error(`missing entries`);
                expect(entries.next().value).toStrictEqual(["ior:https://test.wo-da.de", 12345]);
                expect(entries.next().value).toMatchObject(["ior://prod.wo-da.de", 444444]);
            })

            test("Rollback with IOR Map", async () => {
                model.someIORMap = new Map();
                model.someIORMap.set('ior:https://test.wo-da.de', 12345);
                model.someIORMap.set(new DefaultIOR().init("prod.wo-da.de"), 444444);

                ucpModel.startTransaction();
                model.someIORMap.set('ior:google.de', 666);

                //@ts-ignore check internals
                expect(ucpModel._history[ucpModel._history.length - 2].modelSnapshot.someIORMap.length).toBe(2);
                ucpModel.rollbackTransaction();
                model = ucpModel.model;
                expect(model.someIORMap).not.toBe(undefined);

                expect(model.someIORMap?.size).toBe(2);

                let entries = model.someIORMap?.entries();
                if (!entries) throw new Error(`missing entries`);
                expect(entries.next()).toStrictEqual({ "done": false, "value": ["ior:https://test.wo-da.de", 12345] });
                expect(entries.next()).toStrictEqual({ "done": false, "value": ["ior://prod.wo-da.de", 444444] });

            })

            test("Map to Json with String Key", async () => {
                model.someMap = new Map();
                model.someMap.set('my Key', 12345);
                model.someMap.set('my Key2', 444444);

                expect(ucpModel.toJSON).toStrictEqual("{\"_component\":{\"name\":\"SomeExampleUcpComponent\"},\"name\":\"MyDefaultName\",\"someMap\":[[\"my Key\",12345],[\"my Key2\",444444]]}");
            })

            test("Map to Json with Number Key", async () => {
                model.someNumberMap = new Map();
                model.someNumberMap.set(1, 12345);
                model.someNumberMap.set(2, 444444);

                expect(ucpModel.toJSON).toStrictEqual("{\"_component\":{\"name\":\"SomeExampleUcpComponent\"},\"name\":\"MyDefaultName\",\"someNumberMap\":[[1,12345],[2,444444]]}");

                expect(ucpModel.changelog).toMatchObject({ "someNumberMap": { "2": { "from": undefined, "key": ["someNumberMap", 2], "method": "create", "to": 444444 } } });

            })

            test("Map to Json with IOR Key", async () => {
                model.someIORMap = new Map();
                model.someIORMap.set('ior:https://test.wo-da.de', 12345);
                model.someIORMap.set(new DefaultIOR().init("prod.wo-da.de"), 444444);

                expect(ucpModel.toJSON).toStrictEqual("{\"_component\":{\"name\":\"SomeExampleUcpComponent\"},\"name\":\"MyDefaultName\",\"someIORMap\":[[\"ior:https://test.wo-da.de\",12345],[\"ior://prod.wo-da.de\",444444]]}");

                expect(ucpModel.changelog).toMatchObject({ "someIORMap": { "ior://prod.wo-da.de": { "from": undefined, "key": ["someIORMap", "ior://prod.wo-da.de"], "method": "create", "to": 444444 } } });
            })
        })

        describe("IOR", () => {
            test("set IOR", async () => {
                const ior = new DefaultIOR().init("https://wo-da.de");
                model.iorObject = ior;
                //@ts-ignore Check internals
                expect(ucpModel.latestParticle.modelSnapshot.iorObject).toBe("ior:https://wo-da.de")
            })

            test("set IOR as String", async () => {
                const ior = "https://wo-da.de";
                model.iorObject = ior;
                //@ts-ignore Check internals
                expect(ucpModel.latestParticle.modelSnapshot.iorObject).toBe("ior:https://wo-da.de")
            })

            test("set Object with IOR", async () => {
                let object = new SomeExampleUcpComponent();
                model.iorObject = object;

                expect(model.iorObject).toBe(object);
                //@ts-ignore Check internals
                expect(ucpModel.latestParticle.modelSnapshot.iorObject).toBe(object.IOR.href)
            })

            test("set UDE Object", async () => {
                let object = new SomeExampleUcpComponent();
                await object.initPersistanceManager();
                await object.persistanceManager.create();

                model.iorObject = object.IOR.href;

                let resultPromise = model.iorObject;

                expect(ExtendedPromise.isPromise(resultPromise)).toBeTruthy();

                let result = await resultPromise;

                expect(result).toBe(object);

                object.persistanceManager.delete();

                //@ts-ignore Check internals
                expect(ucpModel.latestParticle.modelSnapshot.iorObject).toBe(object.IOR.href)
            })

            test("loadOnAccess false", async () => {
                const ior = new DefaultIOR().init("https://wo-da.de");
                model.iorObject = ior;
                ucpModel.loadOnAccess = false;
                expect(model.iorObject).toBe(ior);
            })

            test("loadOnAccess true", async () => {
                let object = new SomeExampleUcpComponent();
                await object.initPersistanceManager();
                await object.persistanceManager.create();

                model.iorObject = object.IOR.href;

                let resultPromise = model.iorObject;

                expect(ExtendedPromise.isPromise(resultPromise)).toBeTruthy();

                let result = await resultPromise;

                object.persistanceManager.delete();

                expect(result).toBe(object);
            })
        })

    })
    describe("Helper", () => {


        // Test bis es ein sauberes schema gibt
        test("IOR Schema", async () => {
            expect(UcpModelProxyIORSchema.description).toBe("IOR Object");

            const ior = new DefaultIOR().init("google.de");
            expect(JSON.stringify(UcpModelProxyIORSchema.parse(ior))).toBe('{"href":"ior://google.de"}');
        })
    })
})