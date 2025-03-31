import { Entity, Property, PrimaryKey, ManyToOne, OneToMany, Collection, ManyToMany } from '@mikro-orm/core';
import {BaseEntity} from "./BaseEntity";

@Entity()
export default class Inventory extends BaseEntity{
   @Property({nullable:true})
    storeId?: number;
   @Property()
    productId!: number;
   @Property()
    quantity!: number;
}
