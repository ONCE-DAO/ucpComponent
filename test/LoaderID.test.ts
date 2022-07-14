import { LoaderID } from "ior:esm:/tla.EAM.Once[build]"

test("init", async () => {
    let names = LoaderID.implementations.map(x => x.name);



    expect(names.includes("AbstractDefaultLoader"), names.join(',')).toBeTruthy();
})
