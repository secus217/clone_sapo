import { Entity, Property, PrimaryKey, ManyToOne,Reference } from '@mikro-orm/core';
import  Order from './Order';
import  Product  from './Product';
import {BaseEntity} from "./BaseEntity";

@Entity()
export default class OrderItem extends BaseEntity{


    @ManyToOne(() => Order)
    order!: Order;

    @ManyToOne(() => Product)
    product!: Reference<Product>;

    @Property()
    quantity!: number;

    @Property()
    unitPrice!: number;

    @Property()
    totalPrice!: number;


}
