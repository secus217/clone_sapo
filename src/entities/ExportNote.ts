import { Entity, Property, PrimaryKey, ManyToOne, OneToMany, Collection, ManyToMany } from '@mikro-orm/core';
import {BaseEntity} from "./BaseEntity";

@Entity()
export default class ExportNote extends BaseEntity{
    @Property()
    orderId!: number;
    @Property()
    storeId!: number;
    @Property()
    createrId!: number;
    @Property()
    totalQuantity!:number;
    @Property()
    status!: 'completed'|'cancelled';
    @Property({nullable: true})
    note?: string;
}
