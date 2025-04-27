import {Entity, Property, PrimaryKey, ManyToOne, OneToMany, Collection, ManyToMany} from '@mikro-orm/core';
import {BaseEntity} from "./BaseEntity";
import {Orders} from "./index";

@Entity()
export default class PaymentOrder extends BaseEntity {
    @Property({nullable: true})
    orderId!: number;
    @Property({nullable: true})
    amount?: number;
    @Property({nullable: true})
    paymentMethod!: "cash" | "bank";

}
