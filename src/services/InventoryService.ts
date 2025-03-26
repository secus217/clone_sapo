import {initORM} from "../db"
import {Elysia} from "elysia"
import {Orders, ExportNote, OrderDetail, ExportNoteDetail, ReceiptNote, Product, Inventory} from "../entities/index";

export class InventoryService {

}

export default new Elysia().decorate("inventoryService", new InventoryService());
