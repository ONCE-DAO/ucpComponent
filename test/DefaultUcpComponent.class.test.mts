
import SomeExampleUcpComponent from "../src/2_systems/SomeExampleUcpComponent.class.mjs";



describe("Default UcpComponent", () => {
    test("start", async () => {
        let ucpComponent = new SomeExampleUcpComponent();


        expect(ucpComponent.model.name).toBe("MyDefaultName");
        ucpComponent.model.name = 'some other Name';
        expect(ucpComponent.model.name).toBe("some other Name");
        expect(ucpComponent.model._component.name).toBe(SomeExampleUcpComponent.name)
    })
})