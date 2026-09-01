import { BaseItemDataModel } from "./base-item.js";
import { ContainerCapableMixin } from "./container-capable.js";

export class AccessoryDataModel extends ContainerCapableMixin(BaseItemDataModel) {
    static defineSchema() { return super.defineSchema(); }
}
