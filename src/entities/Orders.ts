import {Entity, Property, PrimaryKey, ManyToOne, OneToMany, Collection, ManyToMany} from '@mikro-orm/core';
import {BaseEntity} from "./BaseEntity";
import OrderDetail from "../entities/OrderDetail";

@Entity()
export default class Orders extends BaseEntity {
    @Property()
    storeId!: number;
    @Property()
    createrId!: number;
    @Property()
    quantity!: number;
    @Property()
    totalAmount!: number;
    @Property({nullable: true})
    paymentMethod!: "cash" | "bank";
    @Property({default: "pending"})
    paymentStatus!: "pending" | "paid" | "cancelled";
    @Property()
    orderStatus!: "completed" | "cancelled" | 'pending';
    @Property({default: "processing"})
    shippingStatus?: "processing" | "completed" | 'cancelled';
    @Property()
    customerId!: number;
    @OneToMany(() => OrderDetail, detail => detail.order)
    orderDetails!: OrderDetail[];
    @Property({nullable: true, default: false})
    isDeleted?: boolean;
    @Property({nullable: true})
    remainAmount?: number;
    @Property({nullable: true})
    payedAmount?: number;
    @Property({nullable: true})
    discount?: number;

}
