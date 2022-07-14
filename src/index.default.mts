import BaseUcpComponent from "./1_infrastructure/BaseUcpComponent.class.mjs";
import DefaultUcpModel, { UcpModelProxyIORSchema, UcpModelProxySchema } from "./2_systems/DefaultUcpModel.class.mjs";
import SomeExampleUcpComponent from "./2_systems/SomeExampleUcpComponent.class.mjs";
import UDELoader from "./2_systems/UDELoader.class.mjs";
import UcpComponent from "./3_services/UcpComponent.interface.mjs";
import UcpModel from "./3_services/UcpModel.interface.mjs";

export default UcpComponent;

export { UDELoader, SomeExampleUcpComponent, BaseUcpComponent, UcpModelProxyIORSchema, UcpModelProxySchema, UcpModel, DefaultUcpModel }
