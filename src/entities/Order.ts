import { Entity, Property, PrimaryKey, ManyToOne, OneToMany, Collection, Enum } from '@mikro-orm/core';
import  User  from './User';
import  OrderItem  from './OrderItem';
import {BaseEntity} from "./BaseEntity";

export enum OrderStatus {
    PENDING = 'pending',
    CONFIRMED = 'confirmed',
    SHIPPING = 'shipping',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled',
}

@Entity()
export default class Order extends BaseEntity{

    @Property()
    orderNumber!: string;

    @ManyToOne(() => User)
    customer!: User;

    @Enum(() => OrderStatus)
    status: OrderStatus = OrderStatus.PENDING;

    @OneToMany(() => OrderItem, item => item.order)
    items = new Collection<OrderItem>(this);

    @Property()
    totalAmount!: number;

    @Property({ nullable: true })
    shippingAddress?: string;

    @Property({ nullable: true })
    paymentMethod?: string;

    @Property({ nullable: true })
    paymentStatus?: 'pending' | 'paid' | 'failed';



}
