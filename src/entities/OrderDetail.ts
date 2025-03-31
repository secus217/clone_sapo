import { Entity, Property, PrimaryKey, ManyToOne, OneToMany, Collection, ManyToMany } from '@mikro-orm/core';
import {BaseEntity} from "./BaseEntity";
import Orders from "../entities/Orders";

@Entity()
export default class OrderDetail extends BaseEntity{

    @Property()
    orderId!: number;
    @Property({nullable: true})
    productId!: number;
    @Property()
    quantity!: number;
    @Property()
    unitPrice!:number;
    @Property()
    totalPrice!: number;
}
