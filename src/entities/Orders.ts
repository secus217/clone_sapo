import { Entity, Property, PrimaryKey, ManyToOne, OneToMany, Collection, ManyToMany } from '@mikro-orm/core';
import {BaseEntity} from "./BaseEntity";

@Entity()
export default class Orders extends BaseEntity{
    @Property()
    storeId!: number;
    @Property({nullable: true})
    createrId?: number;
    @Property()
    quantity!: number;
    @Property()
    totalAmount!:number;
    @Property({nullable: true})
    paymentMethod!: "cash"| "bank";
    @Property({default:"pending"})
    paymentStatus!: "pending" | "paid" | "cancelled";
    @Property()
    orderStatus!: "completed" | "cancelled"|'pending' ;
    @Property()
    receiverName!: string;
    @Property()
    receiverPhone!: string;
    @Property({default:"processing"})
    shippingStatus?:  "processing" | "completed" |'cancelled' ;
    @Property()
    shippingAddress!: string;
    @Property({nullable: true})
    customerId?: number;
}
