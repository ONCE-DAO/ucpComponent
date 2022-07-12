import { z } from "zod";
import DefaultParticle from "./2_systems/DefaultParticle.class.mjs";
import DefaultUcpModel, { UcpModelProxyIORSchema, UcpModelProxySchema } from "./2_systems/DefaultUcpModel.class.mjs";
import SomeExampleUcpComponent from "./2_systems/SomeExampleUcpComponent.class.mjs";
import Particle, { ParticleUDEStructure } from "./3_services/Particle.interface.mjs";
import UcpComponent from "./3_services/UcpComponent.interface.mjs";
import UcpModel, { UcpModelChangelog, UcpModelEvents } from "./3_services/UcpModel.interface.mjs";

export default UcpComponent;

export {
    SomeExampleUcpComponent, z, UcpModelProxyIORSchema, DefaultParticle, UcpModelEvents,
    UcpModelProxySchema, UcpModel, DefaultUcpModel, UcpModelChangelog, ParticleUDEStructure, Particle
}
