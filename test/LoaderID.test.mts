import { LoaderID } from "ior:esm:/tla.EAM.Once[dev]"

test("init", async () => {
    let names = LoaderID.implementations.map(x => x.name);



    expect(names.includes("EAMDLoader"), names.join(',')).toBeTruthy();
})
