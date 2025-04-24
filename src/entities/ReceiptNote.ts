import {Entity, Property, PrimaryKey, ManyToOne, OneToMany, Collection, ManyToMany} from '@mikro-orm/core';
import {BaseEntity} from "./BaseEntity";



@Entity()
export default class ReceiptNote extends BaseEntity {
    @Property({nullable: true})
    orderId?: number;
    @Property()
    storeId!: number;
    @Property()
    createrId!: number;
    @Property()
    totalAmount!: number;
    @Property()
    paymentMethod?: 'cash' |'bank';
    @Property({nullable: true})
    note?: string;
    @Property({default: 'completed'})
    status!: 'completed' | 'cancelled';
    @Property({nullable: true})
    type?: "THU" | "CHI";
    @Property({nullable: true})
    object?: string;
    @Property({nullable: true})
    nameOfCustomer?: string;
    @Property({nullable: true})
    typeOfNote?: string;
}
